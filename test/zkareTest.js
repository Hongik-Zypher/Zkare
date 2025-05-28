const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MedicalRecord Contract", function () {
  let MedicalRecord, medicalRecord, owner, doctor, patient;

  beforeEach(async function () {
    [owner, doctor, patient] = await ethers.getSigners();
    MedicalRecord = await ethers.getContractFactory("MedicalRecord");
    medicalRecord = await MedicalRecord.deploy();
    await medicalRecord.waitForDeployment();
  });

  it("Should deploy successfully", async function () {
    expect(await medicalRecord.getAddress()).to.properAddress;
  });

  // 추가 테스트 케이스는 여기에 작성
});
