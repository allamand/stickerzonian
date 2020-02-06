/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateDeck = /* GraphQL */ `
  subscription OnCreateDeck($owner: String!) {
    onCreateDeck(owner: $owner) {
      id
      name
      stickers {
        items {
          id
          bucket
          owner
        }
        nextToken
      }
      owner
    }
  }
`;
export const onUpdateDeck = /* GraphQL */ `
  subscription OnUpdateDeck($owner: String!) {
    onUpdateDeck(owner: $owner) {
      id
      name
      stickers {
        items {
          id
          bucket
          owner
        }
        nextToken
      }
      owner
    }
  }
`;
export const onDeleteDeck = /* GraphQL */ `
  subscription OnDeleteDeck($owner: String!) {
    onDeleteDeck(owner: $owner) {
      id
      name
      stickers {
        items {
          id
          bucket
          owner
        }
        nextToken
      }
      owner
    }
  }
`;
export const onCreateSticker = /* GraphQL */ `
  subscription OnCreateSticker($owner: String!) {
    onCreateSticker(owner: $owner) {
      id
      deck {
        id
        name
        stickers {
          nextToken
        }
        owner
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
      owner
    }
  }
`;
export const onUpdateSticker = /* GraphQL */ `
  subscription OnUpdateSticker($owner: String!) {
    onUpdateSticker(owner: $owner) {
      id
      deck {
        id
        name
        stickers {
          nextToken
        }
        owner
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
      owner
    }
  }
`;
export const onDeleteSticker = /* GraphQL */ `
  subscription OnDeleteSticker($owner: String!) {
    onDeleteSticker(owner: $owner) {
      id
      deck {
        id
        name
        stickers {
          nextToken
        }
        owner
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
      owner
    }
  }
`;
