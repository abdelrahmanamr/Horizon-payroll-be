import {
  buildIkm,
  decryptString,
  deriveKeyHKDF,
  encryptString,
  generateDeterministicUUID,
  zeroBuffer,
} from "../lib/crypto";
import { UserKey } from "../models/UserKey";
import crypto from "crypto";
import { connectToDatabase } from "../server";
import { getUsers } from "../services/microsoft.sevice";
import { mapAllPayrollPlaintexts } from "../mapper/DecipheredTextMapper";
import { CRMSevice } from "../services/crm.service";

// Helper: get or create per-user seed

export class CryptoController {
  private crmService;

  constructor() {
    this.crmService = new CRMSevice();
  }

  addUsersBulk = async (req, res) => {
    try {
      const { users } = req.body;

      if (!Array.isArray(users) || users.length === 0) {
        return res
          .status(400)
          .json({ error: "users must be a non-empty array" });
      }

      await connectToDatabase();

      const microsoft_users = await getUsers();

      const preparedUsers = [];
      const failedToInsertUsers = [];

      for (const u of users) {
        if (!u.username || !("microsoft_user" in u)) continue;

        let finalObjectId = null;

        // --- Logic for Microsoft Users ---
        if (u.microsoft_user === true) {
          // Fetch the OID from Microsoft if not provided in the request
          const employeeMicrosoftData = microsoft_users.find(
            (user) => user.employeeId === u.username
          );
          finalObjectId = employeeMicrosoftData?.id;
          //  finalObjectId = await microsoft_users.find((user)=>user.employeeId === u.username)?.;
          if (!finalObjectId) {
            failedToInsertUsers.push({
              username: u.username,
              reason: "Could not obtain Object ID for Microsoft user",
            });
            console.error(
              `Could not obtain Object ID for Microsoft user: ${u.username}. Skipping.`
            );
            continue; // Skip this user if we cannot get their Microsoft OID
          }
        } else {
          finalObjectId = generateDeterministicUUID(u.username);
        }

        // Skip duplicates in DB
        const exists = await UserKey.findOne({
          $or: [{ username: u.username }, { userObjectId: finalObjectId }],
        });

        if (!exists) {
          preparedUsers.push({
            username: u.username,
            userObjectId: finalObjectId,
            seed: crypto.randomBytes(32),
            microsoftUser: u.microsoft_user,
          });
        } else {
          failedToInsertUsers.push({
            username: u.username,
            reason: "User already exist in the database",
          });
        }
      }

      if (preparedUsers.length === 0) {
        return res.status(409).json({ error: "All users already exist" });
      }

      const result = await UserKey.insertMany(preparedUsers);

      return res.status(201).json({
        message: `Added ${result.length} users successfully`,
        users: result.map((u) => ({
          username: u.username,
        })),
        failedToInsertUsers: failedToInsertUsers,
      });
    } catch (err) {
      console.error("bulk-add error", err);
      return res.status(500).json({ error: "Failed to add multiple users" });
    }
  };

  // Encryption endpoint
  encrypt = async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(401).json({ error: "missing user info" });
      }

      const { plaintext } = req.body;
      if (typeof plaintext !== "string" || plaintext.length === 0) {
        return res
          .status(400)
          .json({ error: "plaintext must be a non-empty string" });
      }

      await connectToDatabase();
      // Fetch seed and oid
      const uk = await UserKey.findOne({ username: username }).exec();
      if (!uk) {
        return res
          .status(500)
          .json({ error: "User key not found; contact support" });
      }

      const ikm = buildIkm(uk.userObjectId, username);
      const key = deriveKeyHKDF(ikm, uk.seed);

      const payload = encryptString(plaintext, key);

      const payroll = mapAllPayrollPlaintexts([plaintext])[0];

      res.json({ encrypted: payload });

      // zero sensitive buffers
      zeroBuffer(key);
      zeroBuffer(ikm as unknown as Buffer);

      setImmediate(() => {
        this.crmService
          .archivePayroll(username, {
            he_bankacc: payroll.Bank_Acc,
            he_bonus: Number(payroll.Bonus),
            he_gymallowance: Number(payroll.GYM_Allowance),
            he_transportationallowance: Number(
              payroll.Transportation_Allowance
            ),
            he_medical: Number(payroll.Medical),
            he_netsalary: Number(payroll.Net_Salary),
            he_totaldeduction: Number(payroll.Total_Deduction),
            he_absent: Number(payroll.Absent),
            he_otherdeduction: Number(payroll.Other_Deduction),
            he_housingallowance: Number(payroll.Housing_Allowance),
            he_penalities: Number(payroll.Penalities),
            he_vacationbalance: Number(payroll.Vacation_Balance),
            he_overtime: Number(payroll.Overtime),
            he_schoolallowance: Number(payroll.School_Allowance),
            he_fixedbonus: Number(payroll.Fixed_Bonus),
            he_salaryfrom: payroll.Salary_from,
            he_loans: Number(payroll.Loans),
            he_unpaidleave: Number(payroll.Unpaid_Leave),
            he_totalearning: Number(payroll.Total_Earning),
            he_backdatedsalary: Number(payroll.Backdated_Salary),
            he_seasonalbonus: Number(payroll.Seasonal_Bonus),
            he_salaryto: payroll.Salary_to,
            he_paydate: payroll.Salary_to,
            he_pension: Number(payroll.Pension),
            he_salesincentive: Number(payroll.Sales_Incentive),
            he_netpaidsalary: Number(payroll.Net_Paid_Salary),
            he_paymentmethod: payroll.Payment_Method,
            he_perdiem: Number(payroll.Per_Diem),
            he_lateness: Number(payroll.Lateness),
            exchangerate: 1,
          })
          .catch((err) => console.error("CRM failed", err));
      });
    } catch (err) {
      console.error("encrypt error", err);
      return res.status(500).json({ error: "encryption failed" });
    }
  };

  // Decrypt endpoint
  decrypt = async (req, res) => {
    try {
      const { username } = req.body;
      if (!username)
        return res.status(401).json({ error: "missing user info" });

      const { encrypted } = req.body;
      if (
        !Array.isArray(encrypted) ||
        encrypted.some((e) => !e || typeof e.ciphertext !== "string")
      ) {
        return res
          .status(400)
          .json({ error: "invalid encrypted messages array" });
      }
      await connectToDatabase();

      const uk = await UserKey.findOne({ username: username }).exec();
      if (!uk) return res.status(404).json({ error: "user key not found" });

      const ikm = buildIkm(uk.userObjectId, username);
      const key = deriveKeyHKDF(ikm, uk.seed);

      // Decrypt each message
      const plaintexts = encrypted.map((msg) => decryptString(msg, key));

      zeroBuffer(key);
      zeroBuffer(ikm as unknown as Buffer);

      return res.json({ plaintexts });
    } catch (err: any) {
      console.error("decrypt error", err);
      return res
        .status(400)
        .json({ error: "decryption failed or invalid ciphertext" });
    }
  };
}
