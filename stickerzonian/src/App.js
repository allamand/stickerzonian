import React, { Component } from 'react';

import { Container, Divider, Form, Grid, Header, Icon, Input, List, Modal, Segment } from 'semantic-ui-react';
import { BrowserRouter as Router, Route, NavLink } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

import Amplify, { API, Auth, graphqlOperation, Storage } from 'aws-amplify';
import { Connect, S3Image, withAuthenticator } from 'aws-amplify-react';

//import logo from './logo.svg';
//import './App.css';
import aws_exports from './aws-exports';
Amplify.configure(aws_exports);

function makeComparator(key, order = 'asc') {
  return (a, b) => {
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) return 0;

    const aVal = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
    const bVal = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (aVal > bVal) comparison = 1;
    if (aVal < bVal) comparison = -1;

    return order === 'desc' ? (comparison * -1) : comparison
  };
}

const ListDecks = `query ListDecks {
    listDecks(limit: 9999) {
        items {
            id
            name
        }
    }
}`;

const SubscribeToNewDecks = `
  subscription OnCreateDeck {
    onCreateDeck {
      id
      name
    }
  }
`;

const SubscribeToUpdatedDecks = `
  subscription OnUpdateDeck {
    onUpdateDeck {
      id
      name
      owner
      members
    }
  }
`;

const GetDeck = `query GetDeck($id: ID!, $nextTokenForStickers: String) {
    getDeck(id: $id) {
    id
    name
    owner
    members
    stickers(sortDirection: DESC, nextToken: $nextTokenForStickers) {
      nextToken
      items {
        thumbnail {
          width
          height
          key
        }
        fullsize {
          width
          height
          key
        }
      }
    }
  }
}
`;

const SearchStickers = `query SearchStickers($label: String!) {
  searchStickers(filter: { labels: { match: $label }}) {
    items {
      id
      bucket
      thumbnail {
          key
          width
          height
      }
      fullsize {
          key
          width
          height
      }
    }
  }
}`;

class Search extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stickers: [],
      deck: null,
      label: '',
      hasResults: false,
      searched: false
    }
  }

  updateLabel = (e) => {
    this.setState({ label: e.target.value, searched: false });
  }

  getStickersForLabel = async(e) => {
    const result = await API.graphql(graphqlOperation(SearchStickers, { label: this.state.label }));
    let stickers = [];
    let label = '';
    let hasResults = false;
    if (result.data.searchStickers.items.length !== 0) {
      hasResults = true;
      stickers = result.data.searchStickers.items;
      label = this.state.label;
    }
    const searchResults = { label, stickers }
    this.setState({ searchResults, hasResults, searched: true });
  }

  noResults() {
    return !this.state.searched ?
      '' :
      <Header as='h4' color='grey'>No stickers found matching '{this.state.label}'</Header>
  }

  render() {
    return (
      <Segment>
            <Input
              type='text'
              placeholder='Search for stickers'
              icon='search'
              iconPosition='left'
              action={{ content: 'Search', onClick: this.getStickersForLabel }}
              name='label'
              value={this.state.label}
              onChange={this.updateLabel}
            />
            {
                this.state.hasResults 
                ? <StickersList stickers={this.state.searchResults.stickers} />
                : this.noResults()
            }
          </Segment>
    );
  }
}


class S3ImageUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = { uploading: false }
  }

  uploadFile = async(file) => {
    const fileName = uuid();
    const user = await Auth.currentAuthenticatedUser();

    const result = await Storage.put(
      fileName,
      file, {
        customPrefix: { public: 'uploads/' },
        metadata: { deckid: this.props.deckId, owner: user.username }
      }
    );

    console.log('Uploaded sticker: ', result);
  }

  onChange = async(e) => {
    this.setState({ uploading: true });

    let files = [];
    for (var i = 0; i < e.target.files.length; i++) {
      files.push(e.target.files.item(i));
    }
    await Promise.all(files.map(f => this.uploadFile(f)));

    this.setState({ uploading: false });
  }

  render() {
    return (
      <div>
        <Form.Button
          onClick={() => document.getElementById('add-sticker-file-input').click()}
          disabled={this.state.uploading}
          icon='file image outline'
          content={ this.state.uploading ? 'Uploading...' : 'Add Stickers' }
        />
        <input
          id='add-sticker-file-input'
          type="file"
          accept='image/*'
          multiple
          onChange={this.onChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }
}

class StickersList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSticker: null
    };
  }

  handleStickerClick = (sticker) => {
    this.setState({
      selectedSticker: sticker
    });
  }

  handleLightboxClose = () => {
    this.setState({
      selectedSticker: null
    });
  }

  stickerItems() {
    return this.props.stickers.map(sticker =>
      <S3Image 
        key={sticker.thumbnail.key} 
        imgKey={sticker.thumbnail.key.replace('public/', '')} 
        style={{display: 'inline-block', 'paddingRight': '5px'}}
        onClick={this.handlePhotoClick.bind(this, sticker.fullsize)}
      />
    );
  }

  render() {
    return (
      <div>
        <Divider hidden />
        {this.stickerItems()}
        <Lightbox sticker={this.state.selectedSticker} onClose={this.handleLightboxClose} />
      </div>
    );
  }
}


class NewDeck extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deckName: ''
    };
  }

  handleChange = (event) => {
    let change = {};
    change[event.target.name] = event.target.value;
    this.setState(change);
  }

  handleSubmit = async(event) => {
    event.preventDefault();
    const NewDeck = `mutation NewDeck($name: String!) {
      createDeck(input: {name: $name}) {
        id
        name
      }
    }`;

    const result = await API.graphql(graphqlOperation(NewDeck, { name: this.state.deckName }));
    console.info(`Created deck with id ${result.data.createDeck.id}`);
    this.setState({ deckName: '' })
  }

  render() {
    return (
      <Segment>
        <Header as='h3'>Add a new Sticker Deck</Header>
          <Input
          type='text'
          placeholder='New Sticker Deck Name'
          icon='plus'
          iconPosition='left'
          action={{ content: 'Create', onClick: this.handleSubmit }}
          name='deckName'
          value={this.state.deckName}
          onChange={this.handleChange}
          />
        </Segment>
    )
  }
}

class DecksList extends React.Component {
  deckItems() {
    return this.props.decks.sort(makeComparator('name')).map(deck =>
      <List.Item key={deck.id}>
        <NavLink to={`/decks/${deck.id}`}>{deck.name}</NavLink>
      </List.Item>
    );
  }

  render() {
    return (
      <Segment>
        <Header as='h3'>My Sticker Decks</Header>
        <List divided relaxed>
          {this.deckItems()}
        </List>
      </Segment>
    );
  }
}


class DeckDetailsLoader extends React.Component {
  constructor(props) {
    super(props);

    console.log(util.inspect(this.props, false, null, false /* enable colors */ ));

    this.state = {
      nextTokenForStickers: null,
      hasMoreStickers: true,
      deck: null,
      loading: true
    }
  }

  async loadMoreStickers() {
    if (!this.state.hasMoreStickers) return;

    this.setState({ loading: true });
    const { data } = await API.graphql(graphqlOperation(GetDeck, { id: this.props.id, nextTokenForStickers: this.state.nextTokenForStickers }));

    let deck;
    if (this.state.deck === null) {
      deck = data.getDeck;
    }
    else {
      deck = this.state.deck;
      deck.stickers.items = deck.stickers.items.concat(data.getDeck.stickers.items);
    }
    this.setState({
      deck: deck,
      loading: false,
      nextTokenForStickers: data.getDeck.stickers.nextToken,
      hasMoreStickers: data.getDeck.stickers.nextToken !== null
    });
  }

  componentDidMount() {
    this.loadMoreStickers();

    const subscription = API.graphql(graphqlOperation(SubscribeToUpdatedDecks)).subscribe({
      next: (update) => {
        const deck = update.value.data.onUpdateDeck;
        this.setState({
          deck: Object.assign(this.state.deck, deck)
        })
      }
    });

    this.setState({
      deckUpdatesSubscription: subscription
    })
  }

  componentWillUnmount() {
    this.state.deckUpdatesSubscription.unsubscribe();
  }


  render() {
    return (
      <DeckDetails 
                loadingStickers={this.state.loading} 
                deck={this.state.deck} 
                loadMoreStickers={this.loadMoreStickers.bind(this)} 
                hasMoreStickers={this.state.hasMoreStickers} 
            />
    );
  }
}

class Lightbox extends Component {
  render() {
    return (
      <Modal 
        open={this.props.sticker !== null} 
        onClose={this.props.onClose}
      >
        <Modal.Content>
          <Container textAlign='center'>
            { 
              this.props.sticker? 
              <S3Image 
                imgKey={this.props.sticker.key.replace('public/', '')} 
                theme={{ stickerImg: { maxWidth: '100%' } }}
                onClick={this.props.onClose}
              /> :
              null 
            }
          </Container>
        </Modal.Content>
      </Modal>
    );
  }
}

//for debug
const util = require('util')

class DeckDetails extends Component {
  async componentDidMount() {
    this.setState({
      currentUser: await Auth.currentAuthenticatedUser()
    });
  }
  render() {
    if (!this.props.deck) return 'Loading Sticker deck...' + util.inspect(this.props, false, null, false /* enable colors */ );

    return (
      <Segment>
        <Header as='h3'>{this.props.deck.name}</Header>
        
         {
                this.state.currentUser.username === this.props.deck.owner
                &&
                <Segment.Group>
                  <Segment>
                    <DeckMembers members={this.props.deck.members} />
                  </Segment>
                  <Segment basic>
                    <AddUsernameToDeck deckId={this.props.deck.id} />
                  </Segment>
                </Segment.Group>
              }
              
            <S3ImageUpload deckId={this.props.deck.id}/>        
            <StickersList stickers={this.props.deck.stickers.items} />
            {
                this.props.hasMoreStickers && 
                <Form.Button
                onClick={this.props.loadMoreStickers}
                icon='refresh'
                disabled={this.props.loadingStickers}
                content={this.props.loadingStickers ? 'Loading...' : 'Load more stickers'}
                />
            }
      </Segment>
    )
  }
}

class DecksListLoader extends React.Component {
  onNewDeck = (prevQuery, newData) => {
    // When we get data about a new sticker deck, we need to put in into an object 
    // with the same shape as the original query results, but with the new data added as well
    let updatedQuery = Object.assign({}, prevQuery);
    updatedQuery.listDecks.items = prevQuery.listDecks.items.concat([newData.onCreateDeck]);
    return updatedQuery;
  }

  render() {
    return (
      <Connect 
                query={graphqlOperation(ListDecks)}
                subscription={graphqlOperation(SubscribeToNewDecks)} 
                onSubscriptionMsg={this.onNewDeck}
            >
                {({ data, loading }) => {
                    if (loading) { return <div>Loading...</div>; }
                    if (!data.listDecks) return;

                return <DecksList decks={data.listDecks.items} />;
                }}
            </Connect>
    );
  }
}

class AddUsernameToDeck extends Component {
  constructor(props) {
    super(props);
    this.state = { username: '' };
  }

  handleChange = (e, { name, value }) => this.setState({
    [name]: value
  })

  handleSubmit = async(event) => {
    event.preventDefault();

    const { data } = await API.graphql(graphqlOperation(GetDeck, { id: this.props.deckId }));

    let updatedDeck = data.getDeck;
    const updatedMembers = (data.getDeck.members || []).concat([this.state.username]);
    updatedDeck.members = updatedMembers;
    const { id, name, owner, members } = updatedDeck;
    const updatedDeckInput = { id, name, owner, members };

    const UpdateDeck = `mutation UpdateDeck($input: UpdateDeckInput!) {
      updateDeck(input: $input) {
        id
        members
      }
    }
    `;

    const result = await API.graphql(graphqlOperation(UpdateDeck, { input: updatedDeckInput }));

    console.log(`Added ${this.state.username} to deck id ${result.data.updateDeck.id}`);

    this.setState({ username: '' });
  }

  render() {
    return (
      <Input
        type='text'
        placeholder='Username'
        icon='user plus'
        iconPosition='left'
        action={{ content: 'Add', onClick: this.handleSubmit }}
        name='username'
        value={this.state.username}
        onChange={this.handleChange}
      />
    )
  }
}

const DeckMembers = (props) => (
  <div>
    <Header as='h4'>
      <Icon name='user circle' />
      <Header.Content>Members</Header.Content>
    </Header>
    {
      props.members
      ? <List bulleted> 
          {props.members && props.members.map((member) => <List.Item key={member}>{member}</List.Item>)}
        </List>
      : 'No members yet (besides you). Invite someone below!'
    }
  </div>
);



class App extends Component {
  render() {
    return (
      <Router>
        <Grid padded>
          <Grid.Column>
            <Route path="/" exact component={NewDeck}/>
            <Route path="/" exact component={DecksListLoader}/>
            <Route path="/" exact component={Search}/>

            <Route
              path="/decks/:deckId"
              render={ () => <div><NavLink to='/'>Back to Sticker Decks list</NavLink></div> }
            />
            <Route
              path="/decks/:deckId"
              render={ props => <DeckDetailsLoader id={props.match.params.deckId}/> }
            />
          </Grid.Column>
        </Grid>
      </Router>
    );
  }
}

export default withAuthenticator(App, { includeGreetings: true });
