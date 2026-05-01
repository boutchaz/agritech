import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface IrBracket {
  lower_bound: number;
  upper_bound: number | null;
  rate: number;
  quick_deduction: number;
  period: 'annual' | 'monthly';
}

@Injectable()
export class IrBracketsService {
  private readonly logger = new Logger(IrBracketsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Resolve the bracket set to use for an org. Priority: explicit
   * income_tax_config_id (if it's a UUID of a bracket set name) →
   * org-specific brackets → country default.
   *
   * Returns brackets sorted ascending by lower_bound.
   */
  async resolveBrackets(
    organizationId: string,
    countryCode: string,
    bracketSetName?: string,
  ): Promise<IrBracket[]> {
    const supabase = this.db.getAdminClient();

    // Try org-specific brackets first
    let query = supabase
      .from('income_tax_brackets')
      .select('lower_bound, upper_bound, rate, quick_deduction, period')
      .eq('organization_id', organizationId)
      .order('lower_bound', { ascending: true });
    if (bracketSetName) query = query.eq('bracket_set_name', bracketSetName);

    const { data: orgBrackets } = await query;
    if (orgBrackets && orgBrackets.length > 0) {
      return orgBrackets as IrBracket[];
    }

    // Fall back to country default
    let countryQuery = supabase
      .from('income_tax_brackets')
      .select('lower_bound, upper_bound, rate, quick_deduction, period')
      .is('organization_id', null)
      .eq('country_code', countryCode)
      .order('lower_bound', { ascending: true });
    if (bracketSetName) {
      countryQuery = countryQuery.eq('bracket_set_name', bracketSetName);
    } else if (countryCode === 'MA') {
      countryQuery = countryQuery.eq('bracket_set_name', 'morocco_ir_annual_2026');
    }

    const { data: countryBrackets, error } = await countryQuery;
    if (error) {
      this.logger.warn(`Failed to load IR brackets: ${error.message}`);
      return [];
    }
    return (countryBrackets ?? []) as IrBracket[];
  }

  /**
   * Compute income tax for a given monthly taxable amount using the resolved
   * bracket set. If brackets are annual, the monthly amount is annualised
   * before lookup and the resulting tax is divided back by 12.
   */
  computeMonthlyTax(monthlyTaxable: number, brackets: IrBracket[]): number {
    if (brackets.length === 0 || monthlyTaxable <= 0) return 0;

    const isAnnual = brackets[0].period === 'annual';
    const lookupAmount = isAnnual ? monthlyTaxable * 12 : monthlyTaxable;

    const bracket = brackets.find((b) =>
      lookupAmount >= b.lower_bound &&
      (b.upper_bound === null || lookupAmount < b.upper_bound),
    );
    if (!bracket) return 0;

    const tax = (lookupAmount * bracket.rate) / 100 - Number(bracket.quick_deduction);
    const monthly = isAnnual ? tax / 12 : tax;
    return Math.max(0, monthly);
  }
}
