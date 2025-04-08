const { expect } = require("chai");
const { ethers } = require("hardhat");
const { keccak256, toUtf8Bytes } = require("ethers"); // ✅ 여기에 직접 import

describe("Zkare Contract", function () {
  let ZkareFactory, zkare, doctor, patient;

  beforeEach(async function () {
    [doctor, patient] = await ethers.getSigners();

    ZkareFactory = await ethers.getContractFactory("Zkare");
    zkare = await ZkareFactory.deploy(); // ✅ 여기 꼭 await
  });

  it("Should allow doctor to register a medical record", async function () {
    const recordHash = keccak256(toUtf8Bytes("dummyRecord"));
    const cid = "QmDummyCID";

    await zkare.registerRecord(recordHash, cid, patient.address);

    const count = await zkare.getRecordCount(patient.address);
    expect(count).to.equal(1);

    const record = await zkare.records(patient.address, 0);
    expect(record.recordHash).to.equal(recordHash);
    expect(record.cid).to.equal(cid);
    expect(record.patient).to.equal(patient.address);
    expect(record.doctor).to.equal(doctor.address);
  });

  it("Should not allow non-doctor to register", async function () {
    const recordHash = keccak256(toUtf8Bytes("unauthorized"));
    const cid = "QmNotDoctor";

    await expect(
      zkare.connect(patient).registerRecord(recordHash, cid, patient.address)
    ).to.be.revertedWith("Only doctor can register");
  });
});
