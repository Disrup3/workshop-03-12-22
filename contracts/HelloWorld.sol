// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Objetivos
// Enseñar tipow de datos nativos
contract HelloWorld {
    string public Boss;
    uint256 totalGreetings = 0;
    mapping(string => uint256) userGreetings;

    constructor(string memory _firstGreet, string memory _Boss) {
        Boss = _Boss;
        sayHello(_firstGreet);
    }

    function sayHello(string memory user) public returns (string memory) {
        userGreetings[user]++;
        increaseTotalGreetings();
        return string(abi.encodePacked("hello", user));
    }

    function increaseTotalGreetings() internal {
        totalGreetings++;
    }

    function sayHelloWorld() public pure returns (string memory helloWorld) {
        helloWorld = "hello world";
    }
}
