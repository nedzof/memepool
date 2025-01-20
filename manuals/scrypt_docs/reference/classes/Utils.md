[scrypt-ts](../README.md) / Utils

# Class: Utils

The Utils library provides a set of commonly used utility functions.

## Table of contents

### Constructors

- [constructor](Utils.md#constructor)

### Properties

- [OutputValueLen](Utils.md#outputvaluelen)
- [PubKeyHashLen](Utils.md#pubkeyhashlen)

### Methods

- [buildAddressOutput](Utils.md#buildaddressoutput)
- [buildAddressScript](Utils.md#buildaddressscript)
- [buildOpreturnScript](Utils.md#buildopreturnscript)
- [buildOutput](Utils.md#buildoutput)
- [buildPublicKeyHashOutput](Utils.md#buildpublickeyhashoutput)
- [buildPublicKeyHashScript](Utils.md#buildpublickeyhashscript)
- [fromLEUnsigned](Utils.md#fromleunsigned)
- [readVarint](Utils.md#readvarint)
- [toLEUnsigned](Utils.md#toleunsigned)
- [writeVarint](Utils.md#writevarint)

## Constructors

### constructor

• **new Utils**()

## Properties

### OutputValueLen

▪ `Static` `Readonly` **OutputValueLen**: `bigint`

number of string to denote output value

#### Defined in

dist/smart-contract/builtins/functions.d.ts:910

___

### PubKeyHashLen

▪ `Static` `Readonly` **PubKeyHashLen**: `bigint`

number of string to denote a public key hash

#### Defined in

dist/smart-contract/builtins/functions.d.ts:912

## Methods

### buildAddressOutput

▸ `Static` **buildAddressOutput**(`addr`, `amount`): [`ByteString`](../README.md#bytestring)

constructs a standard payment (P2PKH) output from a given address and satoshi amount

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `addr` | `Ripemd160` | the recipient's address |
| `amount` | `bigint` | the satoshi amount |

#### Returns

[`ByteString`](../README.md#bytestring)

a `ByteString` representing the P2PKH output

#### Defined in

dist/smart-contract/builtins/functions.d.ts:970

___

### buildAddressScript

▸ `Static` **buildAddressScript**(`addr`): [`ByteString`](../README.md#bytestring)

constructs a standard payment (P2PKH) script from a given address

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `addr` | `Ripemd160` | the recipient's address |

#### Returns

[`ByteString`](../README.md#bytestring)

a `ByteString` representing the P2PKH script

#### Defined in

dist/smart-contract/builtins/functions.d.ts:963

___

### buildOpreturnScript

▸ `Static` **buildOpreturnScript**(`data`): [`ByteString`](../README.md#bytestring)

build `OP_FALSE OP_RETURN` script from data payload

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | [`ByteString`](../README.md#bytestring) | the data payload |

#### Returns

[`ByteString`](../README.md#bytestring)

a ByteString contains the data payload

#### Defined in

dist/smart-contract/builtins/functions.d.ts:976

___

### buildOutput

▸ `Static` **buildOutput**(`outputScript`, `outputSatoshis`): [`ByteString`](../README.md#bytestring)

build a tx output from its script and satoshi amount

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `outputScript` | [`ByteString`](../README.md#bytestring) | the locking script |
| `outputSatoshis` | `bigint` | the satoshi amount |

#### Returns

[`ByteString`](../README.md#bytestring)

a `ByteString` that represents an output

#### Defined in

dist/smart-contract/builtins/functions.d.ts:944

___

### buildPublicKeyHashOutput

▸ `Static` **buildPublicKeyHashOutput**(`pubKeyHash`, `amount`): [`ByteString`](../README.md#bytestring)

constructs a P2PKH output from a given PubKeyHash and satoshi amount

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `pubKeyHash` | `Ripemd160` | the recipient's public key hash |
| `amount` | `bigint` | the satoshi amount |

#### Returns

[`ByteString`](../README.md#bytestring)

a `ByteString` representing the P2PKH output

#### Defined in

dist/smart-contract/builtins/functions.d.ts:957

___

### buildPublicKeyHashScript

▸ `Static` **buildPublicKeyHashScript**(`pubKeyHash`): [`ByteString`](../README.md#bytestring)

constructs a P2PKH script from a given PubKeyHash

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `pubKeyHash` | `Ripemd160` | the recipient's public key hash |

#### Returns

[`ByteString`](../README.md#bytestring)

a `ByteString` representing the P2PKH script

#### Defined in

dist/smart-contract/builtins/functions.d.ts:950

___

### fromLEUnsigned

▸ `Static` **fromLEUnsigned**(`bytes`): `bigint`

convert `ByteString` to unsigned integer, in sign-magnitude little endian

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bytes` | [`ByteString`](../README.md#bytestring) | the `ByteString` to be converted |

#### Returns

`bigint`

returns a number

#### Defined in

dist/smart-contract/builtins/functions.d.ts:925

___

### readVarint

▸ `Static` **readVarint**(`buf`): [`ByteString`](../README.md#bytestring)

read a [VarInt (variable integer)][https://learnmeabitcoin.com/technical/varint](https://learnmeabitcoin.com/technical/varint) field from the beginning of 'buf'

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `buf` | [`ByteString`](../README.md#bytestring) | a buffer `ByteString` |

#### Returns

[`ByteString`](../README.md#bytestring)

return a `ByteString` of the VarInt field

#### Defined in

dist/smart-contract/builtins/functions.d.ts:931

___

### toLEUnsigned

▸ `Static` **toLEUnsigned**(`n`, `l`): [`ByteString`](../README.md#bytestring)

convert signed integer `n` to unsigned integer of `l` string, in little endian

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `n` | `bigint` | the number to be converted |
| `l` | `bigint` | expected length |

#### Returns

[`ByteString`](../README.md#bytestring)

returns a `ByteString`

#### Defined in

dist/smart-contract/builtins/functions.d.ts:919

___

### writeVarint

▸ `Static` **writeVarint**(`buf`): [`ByteString`](../README.md#bytestring)

convert 'b' to a [VarInt (variable integer)][https://learnmeabitcoin.com/technical/varint](https://learnmeabitcoin.com/technical/varint) field, including the preceding length

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `buf` | [`ByteString`](../README.md#bytestring) | a buffer `ByteString` |

#### Returns

[`ByteString`](../README.md#bytestring)

return a `ByteString` appended the VarInt

#### Defined in

dist/smart-contract/builtins/functions.d.ts:937
