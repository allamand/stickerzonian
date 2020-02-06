/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createDeck = /* GraphQL */ `
  mutation CreateDeck(
    $input: CreateDeckInput!
    $condition: ModelDeckConditionInput
  ) {
    createDeck(input: $input, condition: $condition) {
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
export const updateDeck = /* GraphQL */ `
  mutation UpdateDeck(
    $input: UpdateDeckInput!
    $condition: ModelDeckConditionInput
  ) {
    updateDeck(input: $input, condition: $condition) {
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
export const deleteDeck = /* GraphQL */ `
  mutation DeleteDeck(
    $input: DeleteDeckInput!
    $condition: ModelDeckConditionInput
  ) {
    deleteDeck(input: $input, condition: $condition) {
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
export const createSticker = /* GraphQL */ `
  mutation CreateSticker(
    $input: CreateStickerInput!
    $condition: ModelStickerConditionInput
  ) {
    createSticker(input: $input, condition: $condition) {
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
export const updateSticker = /* GraphQL */ `
  mutation UpdateSticker(
    $input: UpdateStickerInput!
    $condition: ModelStickerConditionInput
  ) {
    updateSticker(input: $input, condition: $condition) {
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
export const deleteSticker = /* GraphQL */ `
  mutation DeleteSticker(
    $input: DeleteStickerInput!
    $condition: ModelStickerConditionInput
  ) {
    deleteSticker(input: $input, condition: $condition) {
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
