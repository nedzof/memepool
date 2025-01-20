---
sidebar_position: 5
---

# Interact with a Deployed Contract

## Overview
In this tutorial, we will interact with a deployed smart contract by calling its public method, in a separate process or by a different party.

To do this, we need to create a smart contract instance that corresponds to the deployed contract on chain.

## The Smart Contract

We will reuse the stateful `Counter` contract [from a previous step](../how-to-write-a-contract/stateful-contract#create-a-stateful-contract).

```ts
export class Counter extends SmartContract {
  // stateful
  @prop(true)
  count: bigint

  constructor(count: bigint) {
      super(...arguments)
      this.count = count
  }

  @method()
  public incrementOnChain() {
      // Increment counter.
      this.increment()

      // Ensure next output will contain this contracts code with
      // the updated count property.
      // And make sure balance in the contract does not change
      const amount: bigint = this.ctx.utxo.value
      // outputs containing the latest state and an optional change output
      const outputs: ByteString = this.buildStateOutput(amount) + this.buildChangeOutput()
      // verify unlocking tx has the same outputs
      assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
  }

  @method()
  increment(): void {
      this.count++
  }
}
```

## Deploy

To deploy the smart contract, we define the following function:

```ts
async function deploy(initialCount = 100n): Promise<string> {
    const instance = new Counter(initialCount)
    await instance.connect(getDefaultSigner())
    const tx = await instance.deploy(1)
    console.log(`Counter deployed: ${tx.id}, the count is: ${instance.count}`)
    return tx.id
}
```

The function deploys the contract with a balance of 1 satoshi and returns the TXID of the deployed contract.

## Interact
Next, we update our deployed smart contract by calling the following function:

```ts
async function callIncrementOnChain(
    txId: string,
    atOutputIndex = 0
): Promise<string> {
    // Fetch TX via provider and reconstruct contract instance.
    const signer = getDefaultSigner()
    const tx = await signer.connectedProvider.getTransaction(txId)
    const instance = Counter.fromTx(tx, atOutputIndex)

    await instance.connect(signer)

    const nextInstance = instance.next()
    nextInstance.increment()

    const { tx: callTx } = await instance.methods.incrementOnChain({
        next: {
            instance: nextInstance,
            balance: instance.balance,
        },
    } as MethodCallOptions<Counter>)
    console.log(`Counter incrementOnChain called: ${callTx.id}, the count now is: ${nextInstance.count}`)
    return callTx.id
}
```

The function takes as parameters the TXID of the deployed smart contract to [create an instance](../how-to-deploy-and-call-a-contract/how-to-deploy-and-call-a-contract.md#create-a-smart-contract-instance-from-a-transaction), along with the output index (which is usually 0). It uses the [`DefaultProvider`](../reference/classes/DefaultProvider) to fetch the transaction data from the blockchain. Subsequently, it reconstructs the smart contract instance using the [`fromTx`](../how-to-write-a-contract/built-ins.md#fromtx) function.

Let's encapsulate the entire process within a main function, designed to deploy the contract and increment its value five times:

```ts
async function main() {
    await compileContract()
    let lastTxId = await deploy()
    for (let i = 0; i < 5; ++i) {
        lastTxId = await callIncrementOnChain(lastTxId)
    }
}

(async () => {
    await main()
})()
```

If we execute the code, we should get an output similar to the following:

```ts
Counter deployed: 1cd6eb4ff0a5bd83f06c60c5e9a5c113c6e44fd876096e4e94e04a80fee8c8ca, the count is: 100
Counter incrementOnChain called: c5b8d8f37f5d9c089a73a321d58c3ae205087ba21c1e32ed09a1b2fbd4f65330, the count now is: 101
Counter incrementOnChain called: c62bb0f187f81dfeb5b70eafe80d549d3b2c6219e16d9575639b4fbdffd1d391, the count now is: 102
Counter incrementOnChain called: 9fb217b98324b633d8a0469d6a2478f522c1f40c0b6d806430efe5ae5457ca0e, the count now is: 103
Counter incrementOnChain called: 2080ddecc7f7731fc6afd307a57c8b117227755bd7b82eb0bc7cd8b78417ad9a, the count now is: 104
Counter incrementOnChain called: de43687fd386e92cd892c18600d473bc38d5adb0cc34bbda892b94c61b5d5eb8, the count now is: 105
```

## Conclusion

Congratulations! You've now deployed AND interacted with a Bitcoin smart contract.
You can see a complete test example in our [boilerplate repository](https://github.com/sCrypt-Inc/boilerplate/blob/master/tests/counterFromTx.test.ts).
