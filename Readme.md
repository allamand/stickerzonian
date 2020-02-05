# StickerZonian

This project allows you through a great application manage, share and trade some great stickers with your community



## Install pre-requisites

### Install nvm (node packet manager)

First, install nvm which is a nodejs package manager

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash
```

From there, we can select the version of nodejs we want to install

```
nvm ls-remote
```

we can pick the latest LTS, and make it default

```
nvm install v12.14.1
nvm alias default v12.14.1
npm install npm@latest -g
```

we can uses

```
# Install the AWS Amplify CLI
npm install -g @aws-amplify/cli
#amplify configure -> do not use this when using isengard 

# Install jq
sudo yum install jq -y
```

## Bootstraping the project 

### Bootstraping the React project

```
npx create-react-app stickerzonian 
cd stickerzonian
```

Adding semantic UI to react :

```
npm install --save semantic-ui-react
```

Add this line `<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.3.3/semantic.min.css"></link>` to public/index.html file


Start the application:
```
npm start
```

### Add Simple authentication

bootstrap using amplify:

```
amplify init
```

> This create a CloudFormation stack and deploy it in your aws account
> This will create a new local configuration for us which we can use to set up an Amazon Cognito User Pool 
> to act as the backend for letting users sign up and sign in. 

Amazon Cognito User Pools is a full-featured user directory service to handle user registration, 
authentication, and account recovery. Amazon Cognito Federated Identities on the other hand, 
is a way to authorize your users to use AWS services.


Amplify interfaces with User Pools to store your user information, including federation with other 
OpenID providers like Facebook & Google, and it leverages Federated Identities to manage user access 
to AWS Resources, for example allowing a user to upload a file to an S3 bucket. The Amplify CLI automates 
the access control policies for these AWS resources as well as provides fine grained access controls via 
GraphQL for protecting data in your APIs.


Use this command to add authentication mechanisms:

```
amplify add auth
```

Then push your updates to amplify to create ressources for your
```
amplify push
```

> check for src/aws-exports.js updates


### Configuring the front end for managing users

#### Adding Amplify NPM dependencies

add the amplify modules to our react application

```
npm install --save aws-amplify aws-amplify-react
```

replace src/Aapp.js content:

```
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
```
seb/leonardo

## Creating GraphQL API for managing our stickers images

### Add AWS AppSync API

```
amplify add api
```


Make change to `amplify/backend/api/stickerzonian/schema.graphql`
```
type Deck @model @auth(rules: [{allow: owner}]) {
    id: ID!
    name: String!
    stickers: [Sticker] @connection(name: "StickersDeck")
}

type Sticker @model @auth(rules: [{allow: owner}]) {
    id: ID!
    deck: Deck @connection(name: "StickersDeck")
    bucket: String!
    fullsize: PhotoS3Info!
    thumbnail: PhotoS3Info!
}

type PhotoS3Info {
    key: String!
    width: Int!
    height: Int!
}
```

Save file and run push again

```
amplify push
```

> select no for code generation when promped

### Trigger some queries in aws app sync console

>Before we can issue queries, we’ll need to authenticate (because our AppSync API is 
configured to authenticate users via the Amazon Cognito User Pool we set up when we configured 
the authentication for our app.

* Click on run query and then on Authenticate with User Pools
* enter values from aws-export.js aws_user_pools_web_client_id
* enter the credentials for the user you created
* 

You may now be able to trigger some queries:

Create a Deck
```
mutation {
    createDeck(input:{name:"First Deck"}) {
        id
        name
    }
}
```

and another one
```
mutation {
    createDeck(input:{name:"Second Deck"}) {
        id
        name
    }
}
```

list all decks

```
query {
    listDecks {
        items {
            id
            name
        }
    }
}
```

the output should be something like:
```
{
  "data": {
    "listDecks": {
      "items": [
        {
          "id": "9b3eb3ba-a76f-4e65-b6ff-df07baf0de0f",
          "name": "First Deck"
        },
        {
          "id": "1dd5c07b-4bfc-4468-844e-6abb6a928339",
          "name": "Second Deck"
        }
      ]
    }
  }
}
```



As you can see, we’re able to read and write data through GraphQL queries and mutations and 
AppSync takes care of reading and persisting data (in this case, to DynamoDB).

### Managing our Decks

At this point, we have a web app that authenticates users and a secure GraphQL API endpoint 
that lets us create and read Deck data. It’s time to connect the two together!

from stickerzonian repo add:
```
npm install --save react-router-dom
```

Update App.js

### Managing StickersDeck


#### Adding cloud storage

We need S3 storage to store the stickers we will upload in our decks.
There is an Amplify storage module we can leverage for this.

```
amplify add storage
```

here what to put:
```
? Please select from one of the below mentioned services: Content (Images, audio, video, etc.)
? Please provide a friendly name for your resource that will be used to label this category ? Please provide a friendly name for your resource that will be used to label this category 
in the project: stickerzonian
? Please provide bucket name: stickerzonian-sticker-bucket
? Who should have access: Auth and guest users
? What kind of access do you want for Authenticated users? create/update, read, delete
? What kind of access do you want for Guest users? read
? Do you want to add a Lambda Trigger for your S3 Bucket? Yes
? Select from the following options Create a new function
Successfully added resource S3Trigger2d87af12 locally
? Do you want to edit the local S3Trigger2d87af12 lambda function now? No
Successfully updated auth resource locally.
Successfully added resource stickerzonian locally
```

Let's have amplify modify our cloud environment, provisionning the storage we just define

```
amplify push
```

After Cloudformation finished creating the resources, we have s3 bucket available for storing our stickers

We need also to track that stickers must be part of the Sticker deck they are uploaded to, so we can 
load all stickers from a particular deck.

Let's create a new S3ImageUpload component.

Install uuid dependency to manage file names

```
npm install --save uuid
```

Update src/App.js with uploading part.


