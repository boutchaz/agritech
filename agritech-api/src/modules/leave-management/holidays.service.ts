import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AddHolidaysDto, CreateHolidayListDto } from './dto';

@Injectable()
export class HolidaysService {
  constructor(private readonly db: DatabaseService) {}

  async listLists(organizationId: string, year?: number) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('holiday_lists')
      .select('*, holidays(*)')
      .eq('organization_id', organizationId)
      .order('year', { ascending: false });
    if (year) query = query.eq('year', year);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createList(organizationId: string, dto: CreateHolidayListDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('holiday_lists')
      .insert({ organization_id: organizationId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async addHolidays(organizationId: string, listId: string, dto: AddHolidaysDto) {
    await this.assertListInOrg(organizationId, listId);
    const supabase = this.db.getAdminClient();
    const rows = dto.holidays.map((h) => ({
      holiday_list_id: listId,
      date: h.date,
      name: h.name,
      name_fr: h.name_fr ?? null,
      name_ar: h.name_ar ?? null,
      holiday_type: h.holiday_type ?? 'public',
      description: h.description ?? null,
    }));
    const { data, error } = await supabase
      .from('holidays')
      .upsert(rows, { onConflict: 'holiday_list_id,date' })
      .select('*');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async deleteList(organizationId: string, listId: string) {
    await this.assertListInOrg(organizationId, listId);
    const supabase = this.db.getAdminClient();
    const { error } = await supabase.from('holiday_lists').delete().eq('id', listId);
    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Pull standard Moroccan public holidays for the given year. Returns the
   * list of inserted rows. Dates of religious/movable holidays are placeholders
   * — admins should adjust per Hijri calendar each year.
   */
  async pullMoroccoHolidays(organizationId: string, listId: string, year: number) {
    await this.assertListInOrg(organizationId, listId);
    const fixedHolidays: Array<{ date: string; name: string; name_fr?: string; name_ar?: string }> = [
      { date: `${year}-01-01`, name: "New Year's Day", name_fr: "Jour de l'An", name_ar: 'رأس السنة الميلادية' },
      { date: `${year}-01-11`, name: 'Independence Manifesto Day', name_fr: 'Manifeste de l’Indépendance', name_ar: 'ذكرى تقديم وثيقة الاستقلال' },
      { date: `${year}-01-14`, name: 'Amazigh New Year (Yennayer)', name_fr: 'Nouvel An Amazigh', name_ar: 'رأس السنة الأمازيغية' },
      { date: `${year}-05-01`, name: 'Labour Day', name_fr: 'Fête du Travail', name_ar: 'عيد الشغل' },
      { date: `${year}-07-30`, name: 'Throne Day', name_fr: 'Fête du Trône', name_ar: 'عيد العرش' },
      { date: `${year}-08-14`, name: 'Oued Ed-Dahab Allegiance', name_fr: 'Allégeance Oued Ed-Dahab', name_ar: 'ذكرى استرجاع وادي الذهب' },
      { date: `${year}-08-20`, name: 'Revolution of King and People', name_fr: 'Révolution du Roi et du Peuple', name_ar: 'ثورة الملك والشعب' },
      { date: `${year}-08-21`, name: "Youth Day", name_fr: 'Fête de la Jeunesse', name_ar: 'عيد الشباب' },
      { date: `${year}-11-06`, name: 'Green March', name_fr: 'Marche Verte', name_ar: 'ذكرى المسيرة الخضراء' },
      { date: `${year}-11-18`, name: 'Independence Day', name_fr: "Fête de l'Indépendance", name_ar: 'عيد الاستقلال' },
    ];
    return this.addHolidays(organizationId, listId, {
      holidays: fixedHolidays.map((h) => ({ ...h, holiday_type: 'public' })),
    });
  }

  private async assertListInOrg(organizationId: string, listId: string) {
    const supabase = this.db.getAdminClient();
    const { data } = await supabase
      .from('holiday_lists')
      .select('id')
      .eq('id', listId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Holiday list not found in organization');
  }
}
