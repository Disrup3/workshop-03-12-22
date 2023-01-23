// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract TeamsBet {
    address public owner;
    uint256 public constant FEE = 10;
    uint256 public deadline;
    uint256 public totalBettedAmount;
    uint256 public winnerId = 100;
    TeamInfo[] public teamList;
    mapping(uint256 => mapping(address => Bet)) teamUserBets;

    struct Bet {
        uint256 amount;
        uint256 betBlocks;
    }

    struct TeamInfo {
        uint256 id;
        string name;
        uint256 amountBetted;
        uint256 totalBetBlocks;
        bool defeated;
    }

    //------- EVENTS -------
    event TeamsBet_newBet(
        uint256 indexed teamId,
        address indexed user,
        uint256 amountBetted
    );

    event TeamsBet__withdrawEarnings(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event TeamsBet__setWinner(uint256 teamId);
    event WorldCup__setDateTheEnd(uint256 newDate);

    constructor(string[] memory _teamList, uint256 _deadLine) {
        owner = msg.sender;
        initializeTeams(_teamList);
        deadline = _deadLine;
    }

    //------- MODIFIERS ----------
    modifier onlyOwner() {
        require(msg.sender == owner, "Onlyowner: user not owner");
        _;
    }

    modifier validTeamId(uint256 teamId) {
        require(
            teamId < teamList.length,
            "team ID must be between 0 and the max teams number"
        );
        require(!teamList[teamId].defeated, "The team has been defeated");
        _;
    }

    modifier isBetOpen() {
        require(
            block.timestamp <= deadline && winnerId > teamList.length,
            "Bet out of time range"
        );
        _;
    }

    modifier isNewDeadlineValid(uint256 newDate) {
        require(newDate > block.timestamp, "Deadline not valid");
        _;
    }

    //------- EXTERNAL FUNCTIONS ---------

    function bet(
        uint256 teamId
    ) external payable validTeamId(teamId) isBetOpen {
        require(msg.value > 0, "nothing to bet");

        teamList[teamId].amountBetted += msg.value;
        teamUserBets[teamId][msg.sender].amount += msg.value;
        totalBettedAmount += msg.value;
        uint256 _betBlocks = deadline - block.timestamp;
        teamUserBets[teamId][msg.sender].betBlocks += _betBlocks;
        teamList[teamId].totalBetBlocks += _betBlocks;
        emit TeamsBet_newBet(teamId, msg.sender, msg.value);
    }

    //check for reentrancy
    function withdraw() external {
        require(winnerId < teamList.length);
        if (teamList[winnerId].amountBetted > 0) {
            require(winnerId < teamList.length);
            uint256 userOwedAmount = getUserOwedAmount(msg.sender);
            require(userOwedAmount > 0, "nothing to withdraw");
            teamUserBets[winnerId][msg.sender].amount = 0;

            transferEth(owner, (userOwedAmount * FEE) / 100);
            transferEth(msg.sender, ((userOwedAmount * (100 - FEE)) / 100));

            emit TeamsBet__withdrawEarnings(
                msg.sender,
                userOwedAmount,
                block.timestamp
            );
        } else {
            transferEth(owner, totalBettedAmount);
            emit TeamsBet__withdrawEarnings(
                owner,
                totalBettedAmount,
                block.timestamp
            );
        }
    }

    //------- INTERNAL -------
    function transferEth(address _to, uint256 amount) internal {
        require(amount >= 0);
        (bool success, ) = _to.call{value: amount}("");
        require(success, "something went wrong");
    }

    function initializeTeams(string[] memory _teamList) internal {
        unchecked {
            for (uint256 i = 0; i < _teamList.length; i++) {
                TeamInfo memory team = TeamInfo(i, _teamList[i], 0, 0, false);
                teamList.push(team);
            }
        }
    }

    //------- ADMIN FUNCTIONS -----------

    function markDefeatedTeam(
        uint256 teamId,
        bool defeated
    ) external onlyOwner {
        teamList[teamId].defeated = defeated;
    }

    function setWinner(
        uint256 winnerTeamId
    ) external validTeamId(winnerTeamId) onlyOwner {
        winnerId = winnerTeamId;
        emit TeamsBet__setWinner(winnerTeamId);
    }

    //------- EDIT FINAL DATE
    function setDateFinish(
        uint256 newDate
    ) external onlyOwner isNewDeadlineValid(newDate) {
        deadline = newDate;
        emit WorldCup__setDateTheEnd(newDate);
    }

    //------- VIEW FUNCTIONS -------

    function getTeamList() public view returns (TeamInfo[] memory) {
        return teamList;
    }

    function getAmountBettedToTeam(
        uint256 _id
    ) public view validTeamId(_id) returns (uint256) {
        return teamList[_id].amountBetted;
    }

    function getUserProceeds(address _user) public view returns (uint256) {
        unchecked {
            uint256 userOwedAmount = getUserOwedAmount(_user);
            return (userOwedAmount * (100 - FEE)) / 100;
        }
    }

    function getUserOwedAmount(address _user) internal view returns (uint256) {
        unchecked {
            uint256 userAmount = teamUserBets[winnerId][_user].amount;
            if (userAmount <= 0) return 0;

            uint256 variableProceeds = totalBettedAmount -
                teamList[winnerId].amountBetted;

            uint256 userAmountPercentaje = (((userAmount * 100) /
                teamList[winnerId].amountBetted) / 2);
            uint256 betBlocksPercentaje = ((teamUserBets[winnerId][_user]
                .betBlocks * 100) / teamList[winnerId].totalBetBlocks) / 2;

            return
                userAmount +
                ((variableProceeds *
                    (userAmountPercentaje + betBlocksPercentaje)) / 100);
        }
    }
}
