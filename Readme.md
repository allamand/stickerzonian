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

> check for src/aws-exports.js updates


### Configuring the front end for managing users

#### Adding Amplify NPM dependencies

add the amplify modules to our react application

```
npm install --save aws-amplify aws-amplify-react
```


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


### Add thumbnails

update amplify/backend/function/S3Triggerxxxxxxx/src/index.js 

```
// amplify/backend/function/S3Triggerxxxxxxx/src/index.js

const AWS = require('aws-sdk');
const S3 = new AWS.S3({ signatureVersion: 'v4' });
const DynamoDBDocClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const uuidv4 = require('uuid/v4');

/*
Note: Sharp requires native extensions to be installed in a way that is compatible
with Amazon Linux (in order to run successfully in a Lambda execution environment).

If you're not working in Cloud9, you can follow the instructions on http://sharp.pixelplumbing.com/en/stable/install/#aws-lambda how to install the module and native dependencies.
*/
const Sharp = require('sharp');

// We'll expect these environment variables to be defined when the Lambda function is deployed
const THUMBNAIL_WIDTH = parseInt(process.env.THUMBNAIL_WIDTH, 10);
const THUMBNAIL_HEIGHT = parseInt(process.env.THUMBNAIL_HEIGHT, 10);
const DYNAMODB_PHOTOS_TABLE_NAME = process.env.DYNAMODB_PHOTOS_TABLE_ARN.split('/')[1];

function storePhotoInfo(item) {
	const params = {
		Item: item,
		TableName: DYNAMODB_PHOTOS_TABLE_NAME
	};
	return DynamoDBDocClient.put(params).promise();
}

async function getMetadata(bucketName, key) {
	const headResult = await S3.headObject({Bucket: bucketName, Key: key }).promise();
	return headResult.Metadata;
}

function thumbnailKey(filename) {
	return `public/resized/${filename}`;
}

function fullsizeKey(filename) {
	return `public/${filename}`;
}

function makeThumbnail(photo) {
	return Sharp(photo).resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT).toBuffer();
}

async function resize(bucketName, key) {
	const originalPhoto = (await S3.getObject({ Bucket: bucketName, Key: key }).promise()).Body;
	const originalPhotoName = key.replace('uploads/', '');
	const originalPhotoDimensions = await Sharp(originalPhoto).metadata();

	const thumbnail = await makeThumbnail(originalPhoto);

	await Promise.all([
		S3.putObject({
			Body: thumbnail,
			Bucket: bucketName,
			Key: thumbnailKey(originalPhotoName),
		}).promise(),

		S3.copyObject({
			Bucket: bucketName,
			CopySource: bucketName + '/' + key,
			Key: fullsizeKey(originalPhotoName),
		}).promise(),
	]);

	await S3.deleteObject({
		Bucket: bucketName,
		Key: key
	}).promise();

	return {
		photoId: originalPhotoName,
		
		thumbnail: {
			key: thumbnailKey(originalPhotoName),
			width: THUMBNAIL_WIDTH,
			height: THUMBNAIL_HEIGHT
		},

		fullsize: {
			key: fullsizeKey(originalPhotoName),
			width: originalPhotoDimensions.width,
			height: originalPhotoDimensions.height
		}
	};
};

async function processRecord(record) {
	const bucketName = record.s3.bucket.name;
	const key = record.s3.object.key;
	
	if (key.indexOf('uploads') != 0) return;
	
	const metadata = await getMetadata(bucketName, key);
	const sizes = await resize(bucketName, key);    
	const id = uuidv4();
	const item = {
		id: id,
		owner: metadata.owner,
		photoAlbumId: metadata.albumid,
		bucket: bucketName,
		thumbnail: sizes.thumbnail,
		fullsize: sizes.fullsize,
		createdAt: new Date().getTime()
	}
	await storePhotoInfo(item);
}

exports.handler = async (event, context, callback) => {
	try {
		event.Records.forEach(processRecord);
		callback(null, { status: 'Photo Processed' });
	}
	catch (err) {
		console.error(err);
		callback(err);
	}
};
```

and amplify/backend/function/S3Triggerxxxxxxx/src/package.json with the following:

```
{
	"name": "S3TriggerPhotoProcessor",
	"version": "1.0.0",
	"description": "The photo uploads processor",
	"main": "index.js",
	"dependencies": {
		"sharp": "^0.24.0",
		"uuid": "^3.3.2"
	}
}
```

Then build the function

```
amplify function build
```

Replace photoalbums/amplify/backend/function/S3Triggerxxxxxxx/S3Triggerxxxxxxx-cloudformation-template.json with the following:

```
{
	"AWSTemplateFormatVersion": "2010-09-09",
	"Description": "Lambda resource stack creation using Amplify CLI",
	"Parameters": {
		"env": {
			"Type": "String"
		},
		"DynamoDBPhotoTableArn": {
			"Type": "String",
			"Default": "DYNAMODB_PHOTO_TABLE_ARN_PLACEHOLDER"
		}
	},
	"Conditions": {
		"ShouldNotCreateEnvResources": {
			"Fn::Equals": [
				{
					"Ref": "env"
				},
				"NONE"
			]
		}
	},
	"Resources": {
		"LambdaFunction": {
			"Type": "AWS::Lambda::Function",
			"Metadata": {
				"aws:asset:path": "./src",
				"aws:asset:property": "Code"
			},
			"Properties": {
				"Handler": "index.handler",
				"FunctionName": {
					"Fn::If": [
						"ShouldNotCreateEnvResources",
						"S3_TRIGGER_NAME_PLACEHOLDER",
						{
							"Fn::Join": [
								"",
								[
									"S3_TRIGGER_NAME_PLACEHOLDER",
									"-",
									{
										"Ref": "env"
									}
								]
							]
						}
					]
				},
				"Environment": {
					"Variables": {
						"ENV": {
							"Ref": "env"
						},
						"THUMBNAIL_WIDTH": "80",
						"THUMBNAIL_HEIGHT": "80",
						"DYNAMODB_PHOTOS_TABLE_ARN": { "Ref" : "DynamoDBPhotoTableArn" }
					}
				},
				"Role": {
					"Fn::GetAtt": [
						"LambdaExecutionRole",
						"Arn"
					]
				},
				"Runtime": "nodejs10.x",
				"Timeout": "25"
			}
		},
		"LambdaExecutionRole": {
			"Type": "AWS::IAM::Role",
			"Properties": {
				"RoleName": {
					"Fn::If": [
						"ShouldNotCreateEnvResources",
						"S3_TRIGGER_NAME_PLACEHOLDERLambdaRole66924eb7",
						{
							"Fn::Join": [
								"",
								[
									"S3_TRIGGER_NAME_PLACEHOLDERLambdaRole66924eb7",
									"-",
									{
										"Ref": "env"
									}
								]
							]
						}
					]
				},
				"AssumeRolePolicyDocument": {
					"Version": "2012-10-17",
					"Statement": [
						{
							"Effect": "Allow",
							"Principal": {
								"Service": [
									"lambda.amazonaws.com"
								]
							},
							"Action": [
								"sts:AssumeRole"
							]
						}
					]
				}
			}
		},
		"lambdaexecutionpolicy": {
			"DependsOn": [
				"LambdaExecutionRole"
			],
			"Type": "AWS::IAM::Policy",
			"Properties": {
				"PolicyName": "lambda-execution-policy",
				"Roles": [
					{
						"Ref": "LambdaExecutionRole"
					}
				],
				"PolicyDocument": {
					"Version": "2012-10-17",
					"Statement": [
						{
							"Effect": "Allow",
							"Action": [
								"logs:CreateLogGroup",
								"logs:CreateLogStream",
								"logs:PutLogEvents"
							],
							"Resource": {
								"Fn::Sub": [
									"arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${lambda}:log-stream:*",
									{
										"region": {
											"Ref": "AWS::Region"
										},
										"account": {
											"Ref": "AWS::AccountId"
										},
										"lambda": {
											"Ref": "LambdaFunction"
										}
									}
								]
							}
						}
					]
				}
			}
		},
		"AllPrivsForDynamo": {
			"DependsOn": [
				"LambdaExecutionRole"
			],
			"Type": "AWS::IAM::Policy",
			"Properties": {
				"PolicyName": "AllPrivsForDynamo",
				"Roles": [
					{
						"Ref": "LambdaExecutionRole"
					}
				],
				"PolicyDocument": {
					"Version": "2012-10-17",
					"Statement": [
						{
							"Effect": "Allow",
							"Action": [
								"dynamodb:*"
							],
							"Resource": { "Ref" : "DynamoDBPhotoTableArn" }
						}
					]
				}
			}
		},
		"RekognitionDetectLabels": {
			"DependsOn": [
				"LambdaExecutionRole"
			],
			"Type": "AWS::IAM::Policy",
			"Properties": {
				"PolicyName": "RekognitionDetectLabels",
				"Roles": [
					{
						"Ref": "LambdaExecutionRole"
					}
				],
				"PolicyDocument": {
					"Version": "2012-10-17",
					"Statement": [
						{
							"Effect": "Allow",
							"Action": [
								"rekognition:detectLabels"
							],
							"Resource": "*"
						}
					]
				}
			}
		}
	},
	"Outputs": {
		"Name": {
			"Value": {
				"Ref": "LambdaFunction"
			}
		},
		"Arn": {
			"Value": {
				"Fn::GetAtt": [
					"LambdaFunction",
					"Arn"
				]
			}
		},
		"Region": {
			"Value": {
				"Ref": "AWS::Region"
			}
		},
		"LambdaExecutionRole": {
			"Value": {
				"Ref": "LambdaExecutionRole"
			}
		}
	}
}
```

Update placeholders from previous template with

```
AMPLIFY_ENV=$(jq -r '.envName' amplify/.config/local-env-info.json)

REGION=$(jq -r '.providers.awscloudformation.Region' amplify/backend/amplify-meta.json)

STACK_ID=$(jq -r '.providers.awscloudformation.StackId' amplify/backend/amplify-meta.json)

ACCOUNT_ID=$(echo $STACK_ID | sed -r 's/^arn:aws:(.+):(.+):(.+):stack.+$/\3/')

API_ID=$(jq -r '.api.stickerzonian.output.GraphQLAPIIdOutput' amplify/backend/amplify-meta.json)

DYNAMO_DB_PHOTO_TABLE_ARN="arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/Sticker-$API_ID-$AMPLIFY_ENV"

S3_TRIGGER_NAME=$(jq -r '.function | to_entries[] | .key' amplify/backend/amplify-meta.json)

sed -i "s/S3_TRIGGER_NAME_PLACEHOLDER/$S3_TRIGGER_NAME/g" amplify/backend/function/$S3_TRIGGER_NAME/$S3_TRIGGER_NAME-cloudformation-template.json

sed -i "s,DYNAMODB_PHOTO_TABLE_ARN_PLACEHOLDER,$DYNAMO_DB_PHOTO_TABLE_ARN,g" amplify/backend/function/$S3_TRIGGER_NAME/$S3_TRIGGER_NAME-cloudformation-template.json
```

If Ok, then just push your changes

```
amplify push
```
