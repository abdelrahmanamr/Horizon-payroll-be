import { Router } from "express";
import { CryptoController } from "../controllers/crypto.controller";
import PayrollController from "../controllers/payroll.controller";

const payrollRouter = Router();
const payrollController = new PayrollController();

payrollRouter.get(
  "/employee/:employeeId/payrolls",
  payrollController.getPayrollsByEmployeeId
);
payrollRouter.post("/employee/payslip", payrollController.createPayslip);

export default payrollRouter;
