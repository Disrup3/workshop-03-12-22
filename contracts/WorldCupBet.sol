// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./utils/Ownable.sol";

// Objetivo: Smart contract que permita a la gente adivnar el equipo que ganará el mundial.
// Fijar sistema de lock de apuestas, no tiene mucho sentido restrinjirlo solo para la final.

// * emitir eventos necesarios para indexar datos y mostrar en frontend:
contract WorldCupBet is Ownable {
    uint256 constant START_WORLDCUP_FINALMATCH = 1671379200;
    uint256 totalBettedAmount = 0;
    uint256 winnerId = 100;
    // teamId => user => amount betted
    mapping(uint256 => mapping(address => uint256)) teamUserBets;
    // mapping that keeps track of the amount betted to a specific team;
    mapping(uint256 => uint256) amountBettedToTeam;

    //------- EVENTS -------
    event WorldCupBet_newBet(
        uint256 indexed teamId,
        address indexed user,
        uint256 amountBetted
    );

    event WorldCupBet__withdrawEarnings(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event WorldCupBet__setWinner(uint256 teamId);

    constructor(address _owner) {
        owner = _owner;
    }

    //------- MODIFIERS ----------
    modifier validTeamId(uint256 teamId) {
        // en octavos de final solo hay 16 equipos
        require(teamId < 16, "team ID must be between 0 and 15");
        _;
    }

    modifier isBettingOpen() {
        require(
            START_WORLDCUP_FINALMATCH <= block.timestamp,
            "Bet out of time range"
        );
        _;
    }

    //------- EXTERNAL FUNCTIONS ---------

    function bet(uint256 teamId)
        external
        payable
        validTeamId(teamId)
        isBettingOpen
    {
        amountBettedToTeam[teamId] += msg.value;
        teamUserBets[teamId][msg.sender] += msg.value;
        totalBettedAmount += msg.value;
        emit WorldCupBet_newBet(teamId, msg.sender, msg.value);
    }

    //check for reentrancy
    function withdraw() external {
        require(winnerId < 16);
        uint256 userOwedAmount = (teamUserBets[winnerId][msg.sender] *
            totalBettedAmount) / amountBettedToTeam[winnerId];

        require(userOwedAmount > 0, "nothing to withdraw");

        teamUserBets[winnerId][msg.sender] = 0;

        // trasfer eth
        transferEth(userOwedAmount);
        // emit event
        emit WorldCupBet__withdrawEarnings(
            msg.sender,
            userOwedAmount,
            block.timestamp
        );
    }

    //------- INTERNAL -------
    function transferEth(uint256 amount) internal {
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
    }

    //------- ADMIN FUNCTIONS -----------

    function setWinner(uint256 winnerTeamId) external onlyOwner {
        winnerId = winnerTeamId;
        emit WorldCupBet__setWinner(winnerTeamId);
    }
}
