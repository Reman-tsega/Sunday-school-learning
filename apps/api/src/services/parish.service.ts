import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { ParishDto, CreateParishInput } from '@eotc/shared';

export interface ParishQueryParams {
  search?: string | undefined;
  diocese?: string | undefined;
  subCity?: string | undefined;
  isVerified?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

const DEFAULT_PARISHES = [
  // Addis Ababa - Arada
  {
    name: 'St. George Cathedral',
    amharicName: 'መንበረ መንግሥት ደብረ ገነት ቅዱስ ጊዮርጊስ ካቴድራል',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Arada (አራዳ)',
    woreda: '01',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ገነት ቅዱስ ጊዮርጊስ ሰንበት ትምህርት ቤት',
    parishType: 'CATHEDRAL',
    isVerified: true,
  },
  {
    name: 'Debre Selam St. Stephen Church',
    amharicName: 'ደብረ ሰላም ቅዱስ እስጢፋኖስ ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Arada (አራዳ)',
    woreda: '03',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ሰላም ቅዱስ እስጢፋኖስ ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Holy Trinity Cathedral',
    amharicName: 'መንበረ ጸባኦት ቅድስት ሥላሴ ካቴድራል',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Arada (አራዳ)',
    woreda: '02',
    city: 'Addis Ababa',
    sundaySchoolName: 'የመንበረ ጸባኦት ቅድስት ሥላሴ ሰንበት ትምህርት ቤት',
    parishType: 'CATHEDRAL',
    isVerified: true,
  },
  {
    name: 'Debre Sina St. Gabriel',
    amharicName: 'ደብረ ሲና ቅዱስ ገብርኤል ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Arada (አራዳ)',
    woreda: '04',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ሲና ቅዱስ ገብርኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Addis Ababa - Kirkos
  {
    name: 'Debre Saba St. Urael Church',
    amharicName: 'ምዕራፈ ቅዱሳን ደብረ ሳባ ቅዱስ ዑራኤል ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Kirkos (ቂርቆስ)',
    woreda: '08',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ሳባ ቅዱስ ዑራኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Debre Amin Tekle Haymanot Church',
    amharicName: 'ደብረ አሚን ተክለ ሃይማኖት ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Kirkos (ቂርቆስ)',
    woreda: '05',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ አሚን ተክለ ሃይማኖት ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Debre Yibabe St. Kirkos Church',
    amharicName: 'ደብረ ይባቤ ቅዱስ ቂርቆስ ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Kirkos (ቂርቆስ)',
    woreda: '06',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ይባቤ ቅዱስ ቂርቆስ ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Addis Ababa - Bole
  {
    name: 'Bole Debre Selam Medhanealem Cathedral',
    amharicName: 'ደብረ ሰላም መድኃኔዓለም ካቴድራል (ቦሌ)',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Bole (ቦሌ)',
    woreda: '03',
    city: 'Addis Ababa',
    sundaySchoolName: 'የቦሌ ደብረ ሰላም መድኃኔዓለም ሰንበት ትምህርት ቤት',
    parishType: 'CATHEDRAL',
    isVerified: true,
  },
  {
    name: 'Debre Mehret St. Ruphael Church',
    amharicName: 'ደብረ ምሕረት ቅዱስ ሩፋኤል ቤተክርስቲያን (ቦሌ)',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Bole (ቦሌ)',
    woreda: '04',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ምሕረት ቅዱስ ሩፋኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Bole Bulbula St. George Church',
    amharicName: 'ደብረ ጽዮን ቅዱስ ጊዮርጊስ ቤተክርስቲያን (ቦሌ ቡልቡላ)',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Bole (ቦሌ)',
    woreda: '12',
    city: 'Addis Ababa',
    sundaySchoolName: 'የቦሌ ቡልቡላ ደብረ ጽዮን ቅዱስ ጊዮርጊስ ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Addis Ababa - Yeka
  {
    name: 'Debre Sahil St. Michael Church',
    amharicName: 'ደብረ ሣህል ቅዱስ ሚካኤል ቤተክርስቲያን (የካ)',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Yeka (የካ)',
    woreda: '07',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ሣህል ቅዱስ ሚካኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Kotebe Debre Bisrat St. Gabriel Church',
    amharicName: 'ኮተቤ ደብረ ብሥራት ቅዱስ ገብርኤል ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Yeka (የካ)',
    woreda: '09',
    city: 'Addis Ababa',
    sundaySchoolName: 'የኮተቤ ደብረ ብሥራት ቅዱስ ገብርኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Entoto Hamere Noh Kidane Mehret Monastery',
    amharicName: 'እንጦጦ ሐመረ ኖኅ ኪዳነ ምሕረት ገዳም',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Yeka (የካ)',
    woreda: '01',
    city: 'Addis Ababa',
    sundaySchoolName: 'የእንጦጦ ሐመረ ኖኅ ኪዳነ ምሕረት ሰንበት ትምህርት ቤት',
    parishType: 'GEDAM',
    isVerified: true,
  },

  // Addis Ababa - Lideta
  {
    name: 'Debre Mitmaq St. Mary Church',
    amharicName: 'ደብረ ምጥማቅ ቅድስት ልደታ ለማርያም ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Lideta (ልደታ)',
    woreda: '04',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ምጥማቅ ቅድስት ልደታ ለማርያም ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Debre Medhanit Medhanealem and Bealewold Church',
    amharicName: 'ደብረ መድኃኒት መድኃኔዓለምና ባዕለወልድ ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Lideta (ልደታ)',
    woreda: '02',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ መድኃኒት ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Addis Ababa - Gullele
  {
    name: 'Debre Tsion St. Mary Church',
    amharicName: 'ደብረ ጽዮን ቅድስት ማርያም ቤተክርስቲያን (ጉለሌ)',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Gullele (ጉለሌ)',
    woreda: '03',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ጽዮን ቅድስት ማርያም ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Taeka Negest Baeta Lemariam Monastery',
    amharicName: 'ታዕካ ነገሥት ባዕታ ለማርያም ገዳም',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Gullele (ጉለሌ)',
    woreda: '05',
    city: 'Addis Ababa',
    sundaySchoolName: 'የባዕታ ለማርያም ገዳም ሰንበት ትምህርት ቤት',
    parishType: 'GEDAM',
    isVerified: true,
  },

  // Addis Ababa - Nifas Silk Lafto
  {
    name: 'Debre Yibabe St. Gebre Menfes Kidus (Saris Abo)',
    amharicName: 'ደብረ ይባቤ ቅዱስ ገብረ መንፈስ ቅዱስ ቤተክርስቲያን (ሳሪስ አቦ)',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Nifas Silk Lafto (ንፋስ ስልክ ላፍቶ)',
    woreda: '10',
    city: 'Addis Ababa',
    sundaySchoolName: 'የሳሪስ አቦ ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Gotera Debre Genat St. Michael Church',
    amharicName: 'ጎተራ ደብረ ገነት ቅዱስ ሚካኤል ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Nifas Silk Lafto (ንፋስ ስልክ ላፍቶ)',
    woreda: '02',
    city: 'Addis Ababa',
    sundaySchoolName: 'የጎተራ ደብረ ገነት ቅዱስ ሚካኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Addis Ababa - Kolfe Keranio
  {
    name: 'Debre Hail St. Michael Church',
    amharicName: 'ደብረ ኃይል ቅዱስ ሚካኤል ቤተክርስቲያን (ኮልፌ)',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Kolfe Keranio (ኮልፌ ቀራንዮ)',
    woreda: '06',
    city: 'Addis Ababa',
    sundaySchoolName: 'የደብረ ኃይል ቅዱስ ሚካኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Keranio Medhanealem Church',
    amharicName: 'ቀራንዮ ደብረ ጽባሕ መድኃኔዓለም ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Kolfe Keranio (ኮልፌ ቀራንዮ)',
    woreda: '04',
    city: 'Addis Ababa',
    sundaySchoolName: 'የቀራንዮ መድኃኔዓለም ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Addis Ababa - Akaki Kality
  {
    name: 'Debre Tsbah St. Gabriel Church (Kality)',
    amharicName: 'ቃሊቲ ደብረ ጽባሕ ቅዱስ ገብርኤል ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Akaki Kality (አቃቂ ቃሊቲ)',
    woreda: '01',
    city: 'Addis Ababa',
    sundaySchoolName: 'የቃሊቲ ደብረ ጽባሕ ቅዱስ ገብርኤል ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Addis Ababa - Lemi Kura
  {
    name: 'Ayat Taeka Negest St. George Church',
    amharicName: 'አያት ታዕካ ነገሥት ቅዱስ ጊዮርጊስ ቤተክርስቲያን',
    diocese: 'Addis Ababa (አዲስ አበባ)',
    subCity: 'Lemi Kura (ለሚ ኩራ)',
    woreda: '08',
    city: 'Addis Ababa',
    sundaySchoolName: 'የአያት ቅዱስ ጊዮርጊስ ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },

  // Regional Dioceses
  {
    name: 'Debre Libanos Monastery',
    amharicName: 'ደብረ ሊባኖስ ገዳም',
    diocese: 'North Shewa (ሰሜን ሸዋ)',
    subCity: 'Debre Libanos (ደብረ ሊባኖስ)',
    city: 'Debre Libanos',
    sundaySchoolName: 'የደብረ ሊባኖስ ገዳም ሰንበት ትምህርት ቤት',
    parishType: 'GEDAM',
    isVerified: true,
  },
  {
    name: 'Debre Berhan Selassie Church (Gondar)',
    amharicName: 'ደብረ ብርሃን ሥላሴ ቤተክርስቲያን (ጎንደር)',
    diocese: 'Gondar (ጎንደር)',
    subCity: 'Gondar City',
    city: 'Gondar',
    sundaySchoolName: 'የደብረ ብርሃን ሥላሴ ሰንበት ትምህርት ቤት',
    parishType: 'DEBRE',
    isVerified: true,
  },
  {
    name: 'Axum Tsion St. Mary Cathedral',
    amharicName: 'ርእሰ አድባራት ቅድስተ ቅዱሳን ድንግል ማርያም ጽዮን (አክሱም)',
    diocese: 'Axum (አክሱም)',
    subCity: 'Axum City',
    city: 'Axum',
    sundaySchoolName: 'የአክሱም ጽዮን ማርያም ሰንበት ትምህርት ቤት',
    parishType: 'CATHEDRAL',
    isVerified: true,
  },
  {
    name: 'Debre Roha St. Lalibela Monolithic Churches',
    amharicName: 'ደብረ ሮሃ ቅዱስ ላሊበላ አብያተ ክርስቲያናት',
    diocese: 'Lasta Lalibela (ላስታ ላሊበላ)',
    subCity: 'Lalibela City',
    city: 'Lalibela',
    sundaySchoolName: 'የደብረ ሮሃ ቅዱስ ላሊበላ ሰንበት ትምህርት ቤት',
    parishType: 'GEDAM',
    isVerified: true,
  },
];

export class ParishService {
  /**
   * Seed default parishes if database has none
   */
  async ensureSeeded(): Promise<void> {
    const count = await prisma.parish.count();
    if (count === 0) {
      await prisma.parish.createMany({
        data: DEFAULT_PARISHES,
        skipDuplicates: true,
      });
    }
  }

  /**
   * List parishes with optional search, diocese, subCity, isVerified filters,
   * alongside aggregate lists of unique dioceses and sub-cities for cascaded filters.
   */
  async listParishes(params: ParishQueryParams) {
    await this.ensureSeeded();

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(200, params.limit ?? 50));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (params.isVerified !== undefined) {
      where.isVerified = params.isVerified;
    }

    if (params.diocese && params.diocese.trim() !== '') {
      where.diocese = { equals: params.diocese.trim(), mode: 'insensitive' };
    }

    if (params.subCity && params.subCity.trim() !== '') {
      where.subCity = { equals: params.subCity.trim(), mode: 'insensitive' };
    }

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { amharicName: { contains: term, mode: 'insensitive' } },
        { sundaySchoolName: { contains: term, mode: 'insensitive' } },
        { subCity: { contains: term, mode: 'insensitive' } },
        { diocese: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, parishes, distinctDioceses, distinctSubCities] = await Promise.all([
      prisma.parish.count({ where }),
      prisma.parish.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { amharicName: 'asc' }],
        include: {
          _count: {
            select: {
              users: true,
            },
          },
          users: {
            select: {
              role: true,
            },
          },
        },
      }),
      prisma.parish.findMany({
        where: { isVerified: true },
        select: { diocese: true },
        distinct: ['diocese'],
        orderBy: { diocese: 'asc' },
      }),
      prisma.parish.findMany({
        where: { isVerified: true, subCity: { not: null } },
        select: { subCity: true, diocese: true },
        distinct: ['subCity'],
        orderBy: { subCity: 'asc' },
      }),
    ]);

    const formattedParishes: ParishDto[] = parishes.map((p) => {
      const studentCount = p.users.filter((u) => u.role === 'STUDENT').length;
      const teacherCount = p.users.filter((u) => u.role === 'TEACHER').length;

      return {
        id: p.id,
        name: p.name,
        amharicName: p.amharicName,
        diocese: p.diocese,
        subCity: p.subCity,
        woreda: p.woreda,
        city: p.city,
        sundaySchoolName: p.sundaySchoolName,
        parishType: p.parishType,
        isVerified: p.isVerified,
        studentCount,
        teacherCount,
      };
    });

    return {
      parishes: formattedParishes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      dioceses: distinctDioceses.map((d) => d.diocese),
      subCities: distinctSubCities
        .map((s) => ({ subCity: s.subCity as string, diocese: s.diocese }))
        .filter((s) => s.subCity !== null),
    };
  }

  /**
   * Find an existing parish by ID
   */
  async getParishById(id: string): Promise<ParishDto> {
    const parish = await prisma.parish.findUnique({
      where: { id },
      include: {
        users: { select: { role: true } },
      },
    });

    if (!parish) {
      throw new AppError(404, 'PARISH_NOT_FOUND', 'Parish not found');
    }

    return {
      id: parish.id,
      name: parish.name,
      amharicName: parish.amharicName,
      diocese: parish.diocese,
      subCity: parish.subCity,
      woreda: parish.woreda,
      city: parish.city,
      sundaySchoolName: parish.sundaySchoolName,
      parishType: parish.parishType,
      isVerified: parish.isVerified,
      studentCount: parish.users.filter((u) => u.role === 'STUDENT').length,
      teacherCount: parish.users.filter((u) => u.role === 'TEACHER').length,
    };
  }

  /**
   * Create or return existing parish (idempotent for user typing or dropdown selection)
   */
  async createOrFindParish(
    data: CreateParishInput,
    suggestedByUserId?: string
  ): Promise<ParishDto> {
    const trimmedName = data.name.trim();
    const trimmedAmharic = data.amharicName.trim();

    // Look for existing parish with identical or close name
    const existing = await prisma.parish.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName, mode: 'insensitive' } },
          { amharicName: { equals: trimmedAmharic, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      return this.getParishById(existing.id);
    }

    const created = await prisma.parish.create({
      data: {
        name: trimmedName,
        amharicName: trimmedAmharic,
        diocese: data.diocese.trim(),
        subCity: data.subCity?.trim() ?? null,
        woreda: data.woreda?.trim() ?? null,
        city: data.city?.trim() ?? 'Addis Ababa',
        sundaySchoolName: data.sundaySchoolName?.trim() ?? null,
        parishType: data.parishType ?? 'DEBRE',
        isVerified: data.isVerified ?? false,
        suggestedBy: suggestedByUserId ?? null,
      },
    });

    return {
      id: created.id,
      name: created.name,
      amharicName: created.amharicName,
      diocese: created.diocese,
      subCity: created.subCity,
      woreda: created.woreda,
      city: created.city,
      sundaySchoolName: created.sundaySchoolName,
      parishType: created.parishType,
      isVerified: created.isVerified,
      studentCount: 0,
      teacherCount: 0,
    };
  }

  /**
   * Admin verification or update
   */
  async verifyParish(id: string, isVerified: boolean): Promise<ParishDto> {
    const parish = await prisma.parish.findUnique({ where: { id } });
    if (!parish) {
      throw new AppError(404, 'PARISH_NOT_FOUND', 'Parish not found');
    }

    const updated = await prisma.parish.update({
      where: { id },
      data: { isVerified },
    });

    return this.getParishById(updated.id);
  }
}

export const parishService = new ParishService();
