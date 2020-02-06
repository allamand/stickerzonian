/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getDeck = /* GraphQL */ `
  query GetDeck($id: ID!) {
    getDeck(id: $id) {
      id
      name
      owner
      members
      stickers {
        items {
          id
          bucket
          labels
          owner
        }
        nextToken
      }
    }
  }
`;
export const listDecks = /* GraphQL */ `
  query ListDecks(
    $filter: ModelDeckFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listDecks(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        owner
        members
        stickers {
          nextToken
        }
      }
      nextToken
    }
  }
`;
export const getSticker = /* GraphQL */ `
  query GetSticker($id: ID!) {
    getSticker(id: $id) {
      id
      deck {
        id
        name
        owner
        members
        stickers {
          nextToken
        }
      }
      bucket
      fullsize {
        key
        width
        height
      }
      thumbnail {
        key
        width
        height
      }
      labels
      owner
    }
  }
`;
export const listStickers = /* GraphQL */ `
  query ListStickers(
    $filter: ModelStickerFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listStickers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        deck {
          id
          name
          owner
          members
        }
        bucket
        fullsize {
          key
          width
          height
        }
        thumbnail {
          key
          width
          height
        }
        labels
        owner
      }
      nextToken
    }
  }
`;
