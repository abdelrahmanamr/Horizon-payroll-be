export class CRMSevice {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.CRM_API_BASE_URL || "";
    this.apiKey = process.env.PAYROLL_API_KEY || "";
  }

  public async archivePayroll(
    employeeId: string,
    payrollData: {
      he_bankacc?: string;
      he_bonus?: number;
      he_gymallowance?: number;
      he_transportationallowance?: number;
      he_medical?: number;
      he_netsalary: number;
      he_totaldeduction?: number;
      he_absent?: number;
      he_otherdeduction?: number;
      he_housingallowance?: number;
      he_penalities?: number;
      he_vacationbalance?: number;
      he_overtime?: number;
      he_schoolallowance?: number;
      he_fixedbonus?: number;
      he_salaryfrom: string; // ISO date string
      he_loans?: number;
      he_unpaidleave?: number;
      exchangerate?: number;
      he_totalearning?: number;
      he_backdatedsalary?: number;
      he_seasonalbonus?: number;
      he_salaryto: string; // ISO date string
      he_paydate: string; // ISO date string
      he_pension?: number;
      he_salesincentive?: number;
      he_netpaidsalary?: number;
      he_paymentmethod?: string;
      he_perdiem?: number;
      he_lateness?: number;
    }
  ): Promise<void> {
    const url = `${this.baseUrl}/api/payroll/employee/${employeeId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(payrollData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to archive payroll data: ${response.status} ${errorText}`
      );
    }
  }
}
