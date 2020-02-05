import React, { Component } from 'react';

import { Grid, Header, Input, List, Segment } from 'semantic-ui-react';
import { BrowserRouter as Router, Route, NavLink } from 'react-router-dom';

import Amplify, { API, graphqlOperation } from 'aws-amplify';
import { Connect, withAuthenticator } from 'aws-amplify-react';

import logo from './logo.svg';
import './App.css';
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

const GetDeck = `query GetDeck($id: ID!) {
  getDeck(id: $id) {
    id
    name
  }
}
`;


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
  render() {
    return (
      <Connect query={graphqlOperation(GetDeck, { id: this.props.id })}>
        {({ data, loading }) => {
          if (loading) { return <div>Loading...</div>; }
          if (!data.getDeck) return;

          return <DeckDetails deck={data.getDeck} />;
        }}
      </Connect>
    );
  }
}

class DeckDetails extends Component {
  render() {
    return (
      <Segment>
        <Header as='h3'>{this.props.deck.name}</Header>
        <p>TODO: Allow Sticker uploads</p>
        <p>TODO: Show Stickers for this album</p>
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
