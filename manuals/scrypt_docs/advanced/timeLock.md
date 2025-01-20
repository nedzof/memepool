---
sidebar_position: 9
---

# Time Lock

## Overview

In this section, we will go over how to create a smart contract, which has a public method, that can only be unlocked once a certain point in time has passed.

### What is a time lock?

In the context of smart contracts, a time-lock is a feature that restricts the spending of specific bitcoins until a specified future time or block height is reached. sCrypt offers capabilities to implement these types of time-locks in your smart contracts, providing a mechanism to ensure a transaction won't be included in a block before a certain point in time or block height is reached. In other words, the smart contract's method cannot be successfully invoked until that point in time has passed.

For instance, this mechanism could be used to add a withdrawal method to a smart contract. In the event of non-cooperation from other parties, an individual could retrieve their funds locked in the smart contract after some amount of time has passed. This approach is utilized in [cross-chain atomic swaps](https://xiaohuiliu.medium.com/cross-chain-atomic-swaps-f13e874fcaa7), for example.

![](../../static/img/swap1.png)
![](../../static/img/swap2.png)
*Image Credit: [bcoin](https://bcoin.io/guides/swaps.html)*

### Implementation

In sCrypt, a time-lock can be enforced by constraining the `locktime` and `sequence` values of the [script execution context](../how-to-write-a-contract/scriptcontext). This context pertains to the execution of the transaction, which includes a call to the smart contract's public method. Thus, if the value is constrained – for example, the `locktime` needs to be above the value `1690236000` (a Unix timestamp) – then this transaction cannot be included into the blockchain until that point in time.

Note that the value of `locktime` can either be a Unix timestamp or a block height. For this value to be enforced, `sequence` also needs to be set to a value less than `0xffffffff`.

sCrypt offers a convenient built-in function `timeLock` to enforce this constraint.

```ts
// Time after which our public method can be called.
@prop()
readonly matureTime: bigint // Can be a timestamp or block height.

// ...

@method()
public unlock() {
    // The following assertion ensures that the `unlock` method can
    // not be successfully invoked until `matureTime` has passed.
    assert(this.timeLock(this.matureTime), 'time lock not yet expired')
}
```

It is important to note that this mechanism can be employed solely to ensure that a method can be called **after** a specific point in time. In contrast, it cannot be employed to ensure that a method is called **before** a specific point in time. 


#### Calling

Upon a method call to the `unlock` method defined above, we need to set the `locktime` value of the transaction that will call the public method. We can do this by simply setting the `locktime` paramater of `MethodCallOptions`.

```ts
timeLock.methods.unlock(
    {
        lockTime: 1673523720
    } as MethodCallOptions<TimeLock>
)
```

Internally this will also set the inputs `sequence` to a value lower than `0xffffffff`. We can also set this value explicitly.


```ts
timeLock.methods.unlock(
    {
        lockTime: 1673523720,
        sequence: 0
    } as MethodCallOptions<TimeLock>
)
```

Lastly, if we are using a [custom transaction builder](../how-to-deploy-and-call-a-contract/how-to-customize-a-contract-tx.md) we need to set these values for the unsigned transaction that we are building there.

```ts
instance.bindTxBuilder('unlock',
  async (
    current: TimeLock,
    options: MethodCallOptions<TimeLock>
  ) => {

    // ...

    if (options.lockTime) {
      unsignedTx.setLockTime(options.lockTime)
    }
    unsignedTx.setInputSequence(0, 0)
    
    // ...
  }
)
```


## How does it work?

Under the hood, the `timeLock` function asserts that the `sequence` value of our calling transaction is less than `UINT_MAX`. This ensures that the Bitcoin network will enforce the `locktime` value.

Next, it checks if our target time-lock value indicates a block height or a Unix timestamp. If it's using a block height, i.e. the time-lock value is less than 500,000,000, the method also ensures that the `locktime` value of the calling transaction corresponds to a block height.

Lastly, the method verifies that the value of `locktime` is greater than or equal to the time-lock we have passed as an argument.

For more information on how the `locktime` and `sequence` values work, please read the [BSV wiki page](https://wiki.bitcoinsv.io/index.php/NLocktime_and_nSequence).
