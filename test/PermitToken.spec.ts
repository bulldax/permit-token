require('module-alias/register');

import * as chai from 'chai';
import BN from 'bn.js';
import ChaiSetup from '@testUtils/chaiSetup';
import { getWeb3 } from '@testUtils/web3Helper';

import {
    PermitTokenInstance
} from '@gen/truffle-contracts';

import Web3 from 'web3';

import { e18 } from '@testUtils/units';

import { expectRevert, singletons } from '@openzeppelin/test-helpers';

const web3: Web3 = getWeb3();

ChaiSetup.configure();

const { expect } = chai;

const permitTokenContract: any = artifacts.require("PermitToken");

contract("GSNToken", ([deployer, user1, user2]) => {
    let token: PermitTokenInstance;
    const totalSupply = e18(1000000);

    before(async () => {
        await singletons.ERC1820Registry(deployer);

        token = await permitTokenContract.new(totalSupply);
    });

    it("name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH", async () => {
        console.log(await token.DOMAIN_SEPARATOR());
    });
});