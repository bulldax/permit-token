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
import { ZERO, ONE } from '@testUtils/constants';


import { expectRevert, singletons } from '@openzeppelin/test-helpers';
import { bigNumberify, hexlify, keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack } from 'ethers/utils'
import { ecsign, ECDSASignature } from 'ethereumjs-util'

import BigNumber from 'bignumber.js';

const web3: Web3 = getWeb3();

ChaiSetup.configure();

const { expect } = chai;

const permitTokenContract: any = artifacts.require("PermitToken");

import {
    getDomainSeparator,
    getPermitTypehash,
    nowInSeconds,
    getApprovalDigest
} from '@testUtils/permitHelper';

contract("PermitToken", ([deployer, user1, user2]) => {
    let token: PermitTokenInstance;
    const name = "PermitToken";
    const symbol = "PMT";
    const decimal = new BN(18);
    const totalSupply = e18(1000000);
    const version = "1";

    before(async () => {
        await singletons.ERC1820Registry(deployer);

        token = await permitTokenContract.new(totalSupply);
    });

    it("name, symbol, decimals, totalSupply, balanceOf, version", async () => {
        expect(await token.name()).to.be.eq(name);
        expect(await token.symbol()).to.be.eq(symbol);
        expect(await token.decimals()).to.be.bignumber.eq(decimal);

        expect(await token.totalSupply()).to.be.bignumber.eq(totalSupply);
        expect(await token.balanceOf(deployer)).to.be.bignumber.eq(totalSupply);

        expect(await token.version()).to.be.eq(version);
    });

    it("DOMAIN_SEPARATOR", async () => {
        expect(await token.DOMAIN_SEPARATOR()).to.be.eq(getDomainSeparator(token.address, name, version));
    });

    it("PERMIT_TYPEHASH", async () => {
        expect(await token.PERMIT_TYPEHASH()).to.be.eq(getPermitTypehash());
    });

    describe("permit", async () => {
        const deployerPrivateKey = '0xf1d1ccb988560dd2eeb0663061223debcf8ff667855bcd482d6399bf23d148e6';
        const user1PrivateKey = '0x52e03a0c88077ea517cc34c4bfddeca5e80fc67109ec2e4c84ba1493507526ff';

        async function permitSignature(
            owner: string,
            privateKey: string,
            spender: string,
            value: BN,
            nonce: BN,
            deadline: BN,
            domainSeparator: string,
            permitTypeHash: string
        ) : Promise<ECDSASignature>
        {
            const digest = await getApprovalDigest(
                domainSeparator,
                permitTypeHash,
                {owner: owner, spender: spender, value: value},
                nonce,
                deadline
            );

            return ecsign(
                Buffer.from(digest.slice(2), 'hex'),
                Buffer.from(privateKey.slice(2), 'hex')
            );
        }

        async function subject(
            owner: string,
            spender: string,
            value: BN,
            deadline: BN,
            v: number,
            r: Buffer,
            s: Buffer
        )
        {
            expect(await token.allowance(owner, spender)).to.be.bignumber.eq(ZERO);
            await token.permit(owner, spender, value, deadline, v, hexlify(r), hexlify(s), {from: spender});
            expect(await token.allowance(owner, spender)).to.be.bignumber.eq(value);

            {
                // tear down phase
                await token.approve(spender, ZERO, {from: owner});
                expect(await token.allowance(owner, spender)).to.be.bignumber.eq(ZERO);
            }
        }

        it("permit: success", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, name, version),
                getPermitTypehash()
            );

            await subject(deployer, user1, value, deadline, v, r, s);
        });

        it("permit: fail when deadline is expired", async () => {
            const deadline = nowInSeconds(-10);
            const value = e18(100);

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, name, version),
                getPermitTypehash()
            );

            await expectRevert(
                subject(deployer, user1, value, deadline, v, r, s),
                "PermitToken.permit: EXPIRED"
            );
        });

        it("permit: invalid nonce failure", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);
            const nonce = (await token.nonces(deployer)).sub(ONE);

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                nonce,
                deadline,
                getDomainSeparator(token.address, name, version),
                getPermitTypehash()
            );

            await expectRevert(
                subject(deployer, user1, value, deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });

        it("permit: invalid privateKey failure", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const {v, r, s} = await permitSignature(
                deployer,
                user1PrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, name, version),
                getPermitTypehash()
            );

            await expectRevert(
                subject(deployer, user1, value, deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });

        it("permit: inconsistent owner failure", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const {v, r, s} = await permitSignature(
                user1,
                user1PrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, name, version),
                getPermitTypehash()
            );

            await expectRevert(
                subject(deployer, user1, value, deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });

        it("permit: inconsistent spender failure", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, name, version),
                getPermitTypehash()
            );

            await expectRevert(
                subject(deployer, user2, value, deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });

        it("permit: inconsistent value failure", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, name, version),
                getPermitTypehash()
            );

            await expectRevert(
                subject(deployer, user1, value.sub(ONE), deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });

        it("permit: fail when wrong domainSeperator", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, "sumdmdkd", version),
                getPermitTypehash()
            );

            await expectRevert(
                subject(deployer, user1, value.sub(ONE), deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });

        it("permit: fail when wrong permitTypeHash", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const worngPermitTypehash = keccak256(
                toUtf8Bytes('Permit(address holder,address spender,uint256 value,uint256 nonce,uint256 deadline)')
            );

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, "sumdmdkd", version),
                worngPermitTypehash
            );

            await expectRevert(
                subject(deployer, user1, value.sub(ONE), deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });

        it("permit: fail when wrong permitTypeHash", async () => {
            const deadline = nowInSeconds(15);
            const value = e18(100);

            const worngPermitTypehash = keccak256(
                toUtf8Bytes('Permit(address holder,address spender,uint256 value,uint256 nonce,uint256 deadline)')
            );

            const {v, r, s} = await permitSignature(
                deployer,
                deployerPrivateKey,
                user1,
                value,
                await token.nonces(deployer),
                deadline,
                getDomainSeparator(token.address, "sumdmdkd", version),
                worngPermitTypehash
            );

            await expectRevert(
                subject(deployer, user1, value.sub(ONE), deadline, v, r, s),
                "PermitToken.permit: INVALID_SIGNATURE"
            );
        });
    });
});



