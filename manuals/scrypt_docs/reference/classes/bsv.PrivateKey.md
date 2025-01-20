[scrypt-ts](../README.md) / [bsv](../modules/bsv.md) / PrivateKey

# Class: PrivateKey

[bsv](../modules/bsv.md).PrivateKey

## Table of contents

### Constructors

- [constructor](bsv.PrivateKey.md#constructor)

### Properties

- [bn](bsv.PrivateKey.md#bn)
- [compressed](bsv.PrivateKey.md#compressed)
- [network](bsv.PrivateKey.md#network)
- [publicKey](bsv.PrivateKey.md#publickey)

### Methods

- [inspect](bsv.PrivateKey.md#inspect)
- [toAddress](bsv.PrivateKey.md#toaddress)
- [toBigNumber](bsv.PrivateKey.md#tobignumber)
- [toBuffer](bsv.PrivateKey.md#tobuffer)
- [toByteString](bsv.PrivateKey.md#tobytestring)
- [toHex](bsv.PrivateKey.md#tohex)
- [toJSON](bsv.PrivateKey.md#tojson)
- [toObject](bsv.PrivateKey.md#toobject)
- [toPublicKey](bsv.PrivateKey.md#topublickey)
- [toString](bsv.PrivateKey.md#tostring)
- [toWIF](bsv.PrivateKey.md#towif)
- [fromBuffer](bsv.PrivateKey.md#frombuffer)
- [fromHex](bsv.PrivateKey.md#fromhex)
- [fromRandom](bsv.PrivateKey.md#fromrandom)
- [fromString](bsv.PrivateKey.md#fromstring)
- [fromWIF](bsv.PrivateKey.md#fromwif)
- [getValidationError](bsv.PrivateKey.md#getvalidationerror)
- [isValid](bsv.PrivateKey.md#isvalid)

## Constructors

### constructor

• **new PrivateKey**(`key?`, `network?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key?` | `string` \| [`PrivateKey`](bsv.PrivateKey.md) |
| `network?` | [`Type`](../modules/bsv.Networks.md#type) |

#### Defined in

node_modules/bsv/index.d.ts:1028

## Properties

### bn

• `Readonly` **bn**: [`BN`](bsv.crypto.BN.md)

#### Defined in

node_modules/bsv/index.d.ts:1030

___

### compressed

• `Readonly` **compressed**: `boolean`

#### Defined in

node_modules/bsv/index.d.ts:1033

___

### network

• `Readonly` **network**: [`Network`](../interfaces/bsv.Networks.Network.md)

#### Defined in

node_modules/bsv/index.d.ts:1034

___

### publicKey

• `Readonly` **publicKey**: [`PublicKey`](bsv.PublicKey.md)

#### Defined in

node_modules/bsv/index.d.ts:1032

## Methods

### inspect

▸ **inspect**(): `string`

#### Returns

`string`

#### Defined in

node_modules/bsv/index.d.ts:1045

___

### toAddress

▸ **toAddress**(`network?`): [`Address`](bsv.Address.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `network?` | [`Type`](../modules/bsv.Networks.md#type) |

#### Returns

[`Address`](bsv.Address.md)

#### Defined in

node_modules/bsv/index.d.ts:1036

___

### toBigNumber

▸ **toBigNumber**(): `any`

#### Returns

`any`

#### Defined in

node_modules/bsv/index.d.ts:1043

___

### toBuffer

▸ **toBuffer**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

node_modules/bsv/index.d.ts:1044

___

### toByteString

▸ **toByteString**(): [`ByteString`](../README.md#bytestring)

#### Returns

[`ByteString`](../README.md#bytestring)

#### Defined in

dist/smart-contract/bsv/privateKey.d.ts:5

___

### toHex

▸ **toHex**(): `string`

#### Returns

`string`

#### Defined in

node_modules/bsv/index.d.ts:1042

___

### toJSON

▸ **toJSON**(): `object`

#### Returns

`object`

#### Defined in

node_modules/bsv/index.d.ts:1040

___

### toObject

▸ **toObject**(): `object`

#### Returns

`object`

#### Defined in

node_modules/bsv/index.d.ts:1039

___

### toPublicKey

▸ **toPublicKey**(): [`PublicKey`](bsv.PublicKey.md)

#### Returns

[`PublicKey`](bsv.PublicKey.md)

#### Defined in

node_modules/bsv/index.d.ts:1037

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

node_modules/bsv/index.d.ts:1038

___

### toWIF

▸ **toWIF**(): `string`

#### Returns

`string`

#### Defined in

node_modules/bsv/index.d.ts:1041

___

### fromBuffer

▸ `Static` **fromBuffer**(`buf`, `network`): [`PrivateKey`](bsv.PrivateKey.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `buf` | `Buffer` |
| `network` | [`Type`](../modules/bsv.Networks.md#type) |

#### Returns

[`PrivateKey`](bsv.PrivateKey.md)

#### Defined in

node_modules/bsv/index.d.ts:1050

___

### fromHex

▸ `Static` **fromHex**(`hex`, `network`): [`PrivateKey`](bsv.PrivateKey.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `hex` | `string` |
| `network` | [`Type`](../modules/bsv.Networks.md#type) |

#### Returns

[`PrivateKey`](bsv.PrivateKey.md)

#### Defined in

node_modules/bsv/index.d.ts:1051

___

### fromRandom

▸ `Static` **fromRandom**(`netowrk?`): [`PrivateKey`](bsv.PrivateKey.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `netowrk?` | `string` \| [`Network`](../interfaces/bsv.Networks.Network.md) |

#### Returns

[`PrivateKey`](bsv.PrivateKey.md)

#### Defined in

node_modules/bsv/index.d.ts:1049

___

### fromString

▸ `Static` **fromString**(`str`): [`PrivateKey`](bsv.PrivateKey.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

[`PrivateKey`](bsv.PrivateKey.md)

#### Defined in

node_modules/bsv/index.d.ts:1047

___

### fromWIF

▸ `Static` **fromWIF**(`str`): [`PrivateKey`](bsv.PrivateKey.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

[`PrivateKey`](bsv.PrivateKey.md)

#### Defined in

node_modules/bsv/index.d.ts:1048

___

### getValidationError

▸ `Static` **getValidationError**(`data`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `string` |

#### Returns

`any`

#### Defined in

node_modules/bsv/index.d.ts:1052

___

### isValid

▸ `Static` **isValid**(`data`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `string` |

#### Returns

`boolean`

#### Defined in

node_modules/bsv/index.d.ts:1053
