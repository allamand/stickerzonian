import React, { Component } from 'react';
import { Header } from 'semantic-ui-react';

import Amplify from 'aws-amplify';
import aws_exports from './aws-exports';
import { withAuthenticator } from 'aws-amplify-react';

import logo from './logo.svg';
import './App.css';
Amplify.configure(aws_exports);

class App extends Component {
  render() {
    return (
      <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
           <Header as='h1'>StickerZonian.</Header>
        </p>

      </header>
    </div>
    );
  }
}


export default withAuthenticator(App, { includeGreetings: true });
