# TokenPaymaster
A project that implements paymaster for DApp which uses token such as ERC20 or ERC777 as a currency.

![CI](https://github.com/bruce-eljovist/ERC20Paymaster/workflows/CI/badge.svg)

[GSN V2](https://github.com/opengsn/gsn) paymaster implementations for ERC20 and ERC777.


## GSNToken
Example ERC20 implementaion Using [GSN V2](https://github.com/opengsn/gsn) and [Openzepplien library](https://github.com/OpenZeppelin/openzeppelin-contracts).


## ERC20Paymaster
Paymaster implementation for ERC20. The ERC20Paymaster pays the ether fee only if all of the following are satisfied:
1. Only for the transfer operation.
2. Only when transferring to a predetermined address.
3. Only if the amount you transfer is greater than the specified minAmount.

Although approve operation is expected to have a high demand for meta-transaction, it is difficult to prevent draining all of the balance of the paymaster through abusing. So only the transfer operation is allowed.

So, when using this paymaster, the below two steps might be required.
1. Transfer to DApp (through ERC20Paymaster)
2. Notify DApp (through another DApp paymaster)

This rather cumbersome process is solved by using ERC777Paymaster.


## ERC777Paymaster
Paymaster implementation for ERC777. The ERC777Paymaster pays the ether fee only if all of the following are satisfied:
1. Only for the send operation.
2. Only when sending it to a predetermined address.
3. Only if the amount you send is greater than the specified minAmount.

Unlike ERC20, ERC777 call IERC777Recipient.tokensReceived through the send operation, so no two steps are required.



## Usage
GSNToken is designed to be used in multiple DApps as a currency. So each DApp provides its own paymaster to pay the fee in ETH only for transactions transferred to themselves.

For example, in the **Casino DApp**, it is required to receive GSNToken from the user. Casino DApp would want to pay Ether fee only when transferring to the app itself. And, in order to prevent draining the paymaster balance, transferring amount is required to be bigger than 1e18. In this case, the ERC20Paymaster contract’s parameter for deployment is below.

```
GSNToken address, Casino DApp address, 1e18
```

In another **Lottery DApp** example, the amount is required to bigger than 1e19 and transfer to the  Lottery DApp. In such a case, the ERC20Paymaster contract’s parameter for deployment is below.

```
GSNToken address, Lottery DApp address, 1e19
```


## install
```console
$ yarn
```

## test
```console
$ yarn totaltest
```