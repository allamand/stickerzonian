import React, { Component } from 'react';

import { Divider, Form, Grid, Header, Input, List, Segment } from 'semantic-ui-react';
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

const GetDeck = `query GetDeck($id: ID!, $nextTokenForStickers: String) {
    getDeck(id: $id) {
    id
    name
    stickers(sortDirection: DESC, nextToken: $nextTokenForStickers) {
      nextToken
      items {
        thumbnail {
          width
          height
          key
        }
      }
    }
  }
}
`;

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
  stickerItems() {
    return this.props.stickers.map(sticker =>
      <S3Image 
        key={sticker.thumbnail.key} 
        imgKey={sticker.thumbnail.key.replace('public/', '')} 
        style={{display: 'inline-block', 'paddingRight': '5px'}}
      />
    );
  }

  render() {
    return (
      <div>
        <Divider hidden />
        {this.stickerItems()}
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

//for debug
const util = require('util')

class DeckDetails extends Component {
  render() {
    if (!this.props.deck) return 'Loading Sticker deck...' + util.inspect(this.props, false, null, false /* enable colors */ );

    return (
      <Segment>
        <Header as='h3'>{this.props.deck.name}</Header>
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

/*
      <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
           <Header as='h1'>StickerZonian.</Header>
        </p>

      </header>
    </div>
*/

class App extends Component {
  render() {
    return (
      <Router>
        <Grid padded>
          <Grid.Column>
            <Route path="/" exact component={NewDeck}/>
            <Route path="/" exact component={DecksListLoader}/>

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
