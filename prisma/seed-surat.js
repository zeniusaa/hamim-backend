// ============================================================
//  HAMIM — Prisma Seed Script
//  Jalankan: node prisma/seed.js
//  Mengisi: surahs (114), ayahs (per surah), audio_files
// ============================================================
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── 1. DATA SURAH (114 surah lengkap) ──────────────────────
const SURAHS = [
  {number:1,  name_arabic:"الفاتحة",       name_transliteration:"Al-Fatihah",     name_translation_id:"Pembukaan",                    name_translation_en:"The Opening",                       juz_start:1,  total_ayah:7,   revelation_type:"makkiyah"},
  {number:2,  name_arabic:"البقرة",         name_transliteration:"Al-Baqarah",     name_translation_id:"Sapi Betina",                  name_translation_en:"The Cow",                           juz_start:1,  total_ayah:286, revelation_type:"madaniyah"},
  {number:3,  name_arabic:"آل عمران",       name_transliteration:"Ali 'Imran",     name_translation_id:"Keluarga Imran",               name_translation_en:"Family of Imran",                   juz_start:3,  total_ayah:200, revelation_type:"madaniyah"},
  {number:4,  name_arabic:"النساء",         name_transliteration:"An-Nisa",        name_translation_id:"Wanita",                       name_translation_en:"The Women",                         juz_start:4,  total_ayah:176, revelation_type:"madaniyah"},
  {number:5,  name_arabic:"المائدة",        name_transliteration:"Al-Ma'idah",     name_translation_id:"Jamuan",                       name_translation_en:"The Table Spread",                  juz_start:6,  total_ayah:120, revelation_type:"madaniyah"},
  {number:6,  name_arabic:"الأنعام",        name_transliteration:"Al-An'am",       name_translation_id:"Binatang Ternak",              name_translation_en:"The Cattle",                        juz_start:7,  total_ayah:165, revelation_type:"makkiyah"},
  {number:7,  name_arabic:"الأعراف",        name_transliteration:"Al-A'raf",       name_translation_id:"Tempat Tertinggi",             name_translation_en:"The Heights",                       juz_start:8,  total_ayah:206, revelation_type:"makkiyah"},
  {number:8,  name_arabic:"الأنفال",        name_transliteration:"Al-Anfal",       name_translation_id:"Rampasan Perang",              name_translation_en:"The Spoils of War",                 juz_start:9,  total_ayah:75,  revelation_type:"madaniyah"},
  {number:9,  name_arabic:"التوبة",         name_transliteration:"At-Taubah",      name_translation_id:"Pengampunan",                  name_translation_en:"The Repentance",                    juz_start:10, total_ayah:129, revelation_type:"madaniyah"},
  {number:10, name_arabic:"يونس",           name_transliteration:"Yunus",          name_translation_id:"Yunus",                        name_translation_en:"Jonah",                             juz_start:11, total_ayah:109, revelation_type:"makkiyah"},
  {number:11, name_arabic:"هود",            name_transliteration:"Hud",            name_translation_id:"Hud",                          name_translation_en:"Hud",                               juz_start:11, total_ayah:123, revelation_type:"makkiyah"},
  {number:12, name_arabic:"يوسف",           name_transliteration:"Yusuf",          name_translation_id:"Yusuf",                        name_translation_en:"Joseph",                            juz_start:12, total_ayah:111, revelation_type:"makkiyah"},
  {number:13, name_arabic:"الرعد",          name_transliteration:"Ar-Ra'd",        name_translation_id:"Guruh",                        name_translation_en:"The Thunder",                       juz_start:13, total_ayah:43,  revelation_type:"madaniyah"},
  {number:14, name_arabic:"إبراهيم",        name_transliteration:"Ibrahim",        name_translation_id:"Ibrahim",                      name_translation_en:"Abraham",                           juz_start:13, total_ayah:52,  revelation_type:"makkiyah"},
  {number:15, name_arabic:"الحجر",          name_transliteration:"Al-Hijr",        name_translation_id:"Pegunungan Hijr",              name_translation_en:"The Rocky Tract",                   juz_start:14, total_ayah:99,  revelation_type:"makkiyah"},
  {number:16, name_arabic:"النحل",          name_transliteration:"An-Nahl",        name_translation_id:"Lebah",                        name_translation_en:"The Bee",                           juz_start:14, total_ayah:128, revelation_type:"makkiyah"},
  {number:17, name_arabic:"الإسراء",        name_transliteration:"Al-Isra",        name_translation_id:"Perjalanan Malam",             name_translation_en:"The Night Journey",                 juz_start:15, total_ayah:111, revelation_type:"makkiyah"},
  {number:18, name_arabic:"الكهف",          name_transliteration:"Al-Kahf",        name_translation_id:"Gua",                          name_translation_en:"The Cave",                          juz_start:15, total_ayah:110, revelation_type:"makkiyah"},
  {number:19, name_arabic:"مريم",           name_transliteration:"Maryam",         name_translation_id:"Maryam",                       name_translation_en:"Mary",                              juz_start:16, total_ayah:98,  revelation_type:"makkiyah"},
  {number:20, name_arabic:"طه",             name_transliteration:"Ta Ha",          name_translation_id:"Ta Ha",                        name_translation_en:"Ta Ha",                             juz_start:16, total_ayah:135, revelation_type:"makkiyah"},
  {number:21, name_arabic:"الأنبياء",       name_transliteration:"Al-Anbiya",      name_translation_id:"Para Nabi",                    name_translation_en:"The Prophets",                      juz_start:17, total_ayah:112, revelation_type:"makkiyah"},
  {number:22, name_arabic:"الحج",           name_transliteration:"Al-Hajj",        name_translation_id:"Haji",                         name_translation_en:"The Pilgrimage",                    juz_start:17, total_ayah:78,  revelation_type:"madaniyah"},
  {number:23, name_arabic:"المؤمنون",       name_transliteration:"Al-Mu'minun",    name_translation_id:"Orang-Orang Beriman",          name_translation_en:"The Believers",                     juz_start:18, total_ayah:118, revelation_type:"makkiyah"},
  {number:24, name_arabic:"النور",          name_transliteration:"An-Nur",         name_translation_id:"Cahaya",                       name_translation_en:"The Light",                         juz_start:18, total_ayah:64,  revelation_type:"madaniyah"},
  {number:25, name_arabic:"الفرقان",        name_transliteration:"Al-Furqan",      name_translation_id:"Pembeda",                      name_translation_en:"The Criterion",                     juz_start:18, total_ayah:77,  revelation_type:"makkiyah"},
  {number:26, name_arabic:"الشعراء",        name_transliteration:"Asy-Syu'ara",    name_translation_id:"Para Penyair",                 name_translation_en:"The Poets",                         juz_start:19, total_ayah:227, revelation_type:"makkiyah"},
  {number:27, name_arabic:"النمل",          name_transliteration:"An-Naml",        name_translation_id:"Semut",                        name_translation_en:"The Ant",                           juz_start:19, total_ayah:93,  revelation_type:"makkiyah"},
  {number:28, name_arabic:"القصص",          name_transliteration:"Al-Qasas",       name_translation_id:"Kisah-Kisah",                  name_translation_en:"The Stories",                       juz_start:20, total_ayah:88,  revelation_type:"makkiyah"},
  {number:29, name_arabic:"العنكبوت",       name_transliteration:"Al-'Ankabut",    name_translation_id:"Laba-Laba",                    name_translation_en:"The Spider",                        juz_start:20, total_ayah:69,  revelation_type:"makkiyah"},
  {number:30, name_arabic:"الروم",          name_transliteration:"Ar-Rum",         name_translation_id:"Bangsa Romawi",                name_translation_en:"The Romans",                        juz_start:21, total_ayah:60,  revelation_type:"makkiyah"},
  {number:31, name_arabic:"لقمان",          name_transliteration:"Luqman",         name_translation_id:"Luqman",                       name_translation_en:"Luqman",                            juz_start:21, total_ayah:34,  revelation_type:"makkiyah"},
  {number:32, name_arabic:"السجدة",         name_transliteration:"As-Sajdah",      name_translation_id:"Sujud",                        name_translation_en:"The Prostration",                   juz_start:21, total_ayah:30,  revelation_type:"makkiyah"},
  {number:33, name_arabic:"الأحزاب",        name_transliteration:"Al-Ahzab",       name_translation_id:"Golongan-Golongan",            name_translation_en:"The Combined Forces",               juz_start:21, total_ayah:73,  revelation_type:"madaniyah"},
  {number:34, name_arabic:"سبأ",            name_transliteration:"Saba",           name_translation_id:"Saba",                         name_translation_en:"Sheba",                             juz_start:22, total_ayah:54,  revelation_type:"makkiyah"},
  {number:35, name_arabic:"فاطر",           name_transliteration:"Fatir",          name_translation_id:"Pencipta",                     name_translation_en:"Originator",                        juz_start:22, total_ayah:45,  revelation_type:"makkiyah"},
  {number:36, name_arabic:"يس",             name_transliteration:"Ya Sin",         name_translation_id:"Ya Sin",                       name_translation_en:"Ya Sin",                            juz_start:22, total_ayah:83,  revelation_type:"makkiyah"},
  {number:37, name_arabic:"الصافات",        name_transliteration:"As-Saffat",      name_translation_id:"Barisan",                      name_translation_en:"Those Who Set The Ranks",           juz_start:23, total_ayah:182, revelation_type:"makkiyah"},
  {number:38, name_arabic:"ص",             name_transliteration:"Sad",            name_translation_id:"Sad",                          name_translation_en:"The Letter Sad",                    juz_start:23, total_ayah:88,  revelation_type:"makkiyah"},
  {number:39, name_arabic:"الزمر",          name_transliteration:"Az-Zumar",       name_translation_id:"Rombongan-Rombongan",          name_translation_en:"The Troops",                        juz_start:23, total_ayah:75,  revelation_type:"makkiyah"},
  {number:40, name_arabic:"غافر",           name_transliteration:"Ghafir",         name_translation_id:"Yang Maha Pengampun",          name_translation_en:"The Forgiver",                      juz_start:24, total_ayah:85,  revelation_type:"makkiyah"},
  {number:41, name_arabic:"فصلت",           name_transliteration:"Fussilat",       name_translation_id:"Yang Dijelaskan",              name_translation_en:"Explained in Detail",               juz_start:24, total_ayah:54,  revelation_type:"makkiyah"},
  {number:42, name_arabic:"الشورى",         name_transliteration:"Asy-Syura",      name_translation_id:"Musyawarah",                   name_translation_en:"The Consultation",                  juz_start:25, total_ayah:53,  revelation_type:"makkiyah"},
  {number:43, name_arabic:"الزخرف",         name_transliteration:"Az-Zukhruf",     name_translation_id:"Perhiasan",                    name_translation_en:"The Ornaments of Gold",             juz_start:25, total_ayah:89,  revelation_type:"makkiyah"},
  {number:44, name_arabic:"الدخان",         name_transliteration:"Ad-Dukhan",      name_translation_id:"Kabut",                        name_translation_en:"The Smoke",                         juz_start:25, total_ayah:59,  revelation_type:"makkiyah"},
  {number:45, name_arabic:"الجاثية",        name_transliteration:"Al-Jasiyah",     name_translation_id:"Yang Berlutut",                name_translation_en:"The Crouching",                     juz_start:25, total_ayah:37,  revelation_type:"makkiyah"},
  {number:46, name_arabic:"الأحقاف",        name_transliteration:"Al-Ahqaf",       name_translation_id:"Bukit-Bukit Pasir",            name_translation_en:"The Wind-Curved Sandhills",         juz_start:26, total_ayah:35,  revelation_type:"makkiyah"},
  {number:47, name_arabic:"محمد",           name_transliteration:"Muhammad",       name_translation_id:"Muhammad",                     name_translation_en:"Muhammad",                          juz_start:26, total_ayah:38,  revelation_type:"madaniyah"},
  {number:48, name_arabic:"الفتح",          name_transliteration:"Al-Fath",        name_translation_id:"Kemenangan",                   name_translation_en:"The Victory",                       juz_start:26, total_ayah:29,  revelation_type:"madaniyah"},
  {number:49, name_arabic:"الحجرات",        name_transliteration:"Al-Hujurat",     name_translation_id:"Kamar-Kamar",                  name_translation_en:"The Rooms",                         juz_start:26, total_ayah:18,  revelation_type:"madaniyah"},
  {number:50, name_arabic:"ق",             name_transliteration:"Qaf",            name_translation_id:"Qaf",                          name_translation_en:"The Letter Qaf",                    juz_start:26, total_ayah:45,  revelation_type:"makkiyah"},
  {number:51, name_arabic:"الذاريات",       name_transliteration:"Az-Zariyat",     name_translation_id:"Angin yang Menerbangkan",      name_translation_en:"The Winnowing Winds",               juz_start:26, total_ayah:60,  revelation_type:"makkiyah"},
  {number:52, name_arabic:"الطور",          name_transliteration:"At-Tur",         name_translation_id:"Bukit",                        name_translation_en:"The Mount",                         juz_start:27, total_ayah:49,  revelation_type:"makkiyah"},
  {number:53, name_arabic:"النجم",          name_transliteration:"An-Najm",        name_translation_id:"Bintang",                      name_translation_en:"The Star",                          juz_start:27, total_ayah:62,  revelation_type:"makkiyah"},
  {number:54, name_arabic:"القمر",          name_transliteration:"Al-Qamar",       name_translation_id:"Bulan",                        name_translation_en:"The Moon",                          juz_start:27, total_ayah:55,  revelation_type:"makkiyah"},
  {number:55, name_arabic:"الرحمن",         name_transliteration:"Ar-Rahman",      name_translation_id:"Yang Maha Pengasih",           name_translation_en:"The Beneficent",                    juz_start:27, total_ayah:78,  revelation_type:"madaniyah"},
  {number:56, name_arabic:"الواقعة",        name_transliteration:"Al-Waqi'ah",     name_translation_id:"Hari Kiamat",                  name_translation_en:"The Inevitable",                    juz_start:27, total_ayah:96,  revelation_type:"makkiyah"},
  {number:57, name_arabic:"الحديد",         name_transliteration:"Al-Hadid",       name_translation_id:"Besi",                         name_translation_en:"The Iron",                          juz_start:27, total_ayah:29,  revelation_type:"madaniyah"},
  {number:58, name_arabic:"المجادلة",       name_transliteration:"Al-Mujadila",    name_translation_id:"Wanita yang Mengajukan Gugatan",name_translation_en:"The Pleading Woman",              juz_start:28, total_ayah:22,  revelation_type:"madaniyah"},
  {number:59, name_arabic:"الحشر",          name_transliteration:"Al-Hasyr",       name_translation_id:"Pengusiran",                   name_translation_en:"The Exile",                         juz_start:28, total_ayah:24,  revelation_type:"madaniyah"},
  {number:60, name_arabic:"الممتحنة",       name_transliteration:"Al-Mumtahanah",  name_translation_id:"Wanita yang Diuji",            name_translation_en:"She That is to be Examined",        juz_start:28, total_ayah:13,  revelation_type:"madaniyah"},
  {number:61, name_arabic:"الصف",           name_transliteration:"As-Saf",         name_translation_id:"Barisan",                      name_translation_en:"The Ranks",                         juz_start:28, total_ayah:14,  revelation_type:"madaniyah"},
  {number:62, name_arabic:"الجمعة",         name_transliteration:"Al-Jumu'ah",     name_translation_id:"Jumat",                        name_translation_en:"The Congregation",                  juz_start:28, total_ayah:11,  revelation_type:"madaniyah"},
  {number:63, name_arabic:"المنافقون",      name_transliteration:"Al-Munafiqun",   name_translation_id:"Orang-Orang Munafik",          name_translation_en:"The Hypocrites",                    juz_start:28, total_ayah:11,  revelation_type:"madaniyah"},
  {number:64, name_arabic:"التغابن",        name_transliteration:"At-Tagabun",     name_translation_id:"Hari Dinampakkan Kesalahan",   name_translation_en:"Mutual Disillusion",                juz_start:28, total_ayah:18,  revelation_type:"madaniyah"},
  {number:65, name_arabic:"الطلاق",         name_transliteration:"At-Talaq",       name_translation_id:"Talak",                        name_translation_en:"Divorce",                           juz_start:28, total_ayah:12,  revelation_type:"madaniyah"},
  {number:66, name_arabic:"التحريم",        name_transliteration:"At-Tahrim",      name_translation_id:"Mengharamkan",                 name_translation_en:"The Prohibition",                   juz_start:28, total_ayah:12,  revelation_type:"madaniyah"},
  {number:67, name_arabic:"الملك",          name_transliteration:"Al-Mulk",        name_translation_id:"Kerajaan",                     name_translation_en:"The Sovereignty",                   juz_start:29, total_ayah:30,  revelation_type:"makkiyah"},
  {number:68, name_arabic:"القلم",          name_transliteration:"Al-Qalam",       name_translation_id:"Pena",                         name_translation_en:"The Pen",                           juz_start:29, total_ayah:52,  revelation_type:"makkiyah"},
  {number:69, name_arabic:"الحاقة",         name_transliteration:"Al-Haqqah",      name_translation_id:"Hari Kiamat",                  name_translation_en:"The Reality",                       juz_start:29, total_ayah:52,  revelation_type:"makkiyah"},
  {number:70, name_arabic:"المعارج",        name_transliteration:"Al-Ma'arij",     name_translation_id:"Tempat-Tempat Naik",           name_translation_en:"The Ascending Stairways",           juz_start:29, total_ayah:44,  revelation_type:"makkiyah"},
  {number:71, name_arabic:"نوح",            name_transliteration:"Nuh",            name_translation_id:"Nuh",                          name_translation_en:"Noah",                              juz_start:29, total_ayah:28,  revelation_type:"makkiyah"},
  {number:72, name_arabic:"الجن",           name_transliteration:"Al-Jinn",        name_translation_id:"Jin",                          name_translation_en:"The Jinn",                          juz_start:29, total_ayah:28,  revelation_type:"makkiyah"},
  {number:73, name_arabic:"المزمل",         name_transliteration:"Al-Muzzammil",   name_translation_id:"Orang yang Berselimut",        name_translation_en:"The Enshrouded One",                juz_start:29, total_ayah:20,  revelation_type:"makkiyah"},
  {number:74, name_arabic:"المدثر",         name_transliteration:"Al-Muddassir",   name_translation_id:"Orang yang Berkemul",          name_translation_en:"The Cloaked One",                   juz_start:29, total_ayah:56,  revelation_type:"makkiyah"},
  {number:75, name_arabic:"القيامة",        name_transliteration:"Al-Qiyamah",     name_translation_id:"Hari Kiamat",                  name_translation_en:"The Resurrection",                  juz_start:29, total_ayah:40,  revelation_type:"makkiyah"},
  {number:76, name_arabic:"الإنسان",        name_transliteration:"Al-Insan",       name_translation_id:"Manusia",                      name_translation_en:"The Man",                           juz_start:29, total_ayah:31,  revelation_type:"madaniyah"},
  {number:77, name_arabic:"المرسلات",       name_transliteration:"Al-Mursalat",    name_translation_id:"Malaikat yang Diutus",         name_translation_en:"The Emissaries",                    juz_start:29, total_ayah:50,  revelation_type:"makkiyah"},
  {number:78, name_arabic:"النبأ",          name_transliteration:"An-Naba",        name_translation_id:"Berita Besar",                 name_translation_en:"The Tidings",                       juz_start:30, total_ayah:40,  revelation_type:"makkiyah"},
  {number:79, name_arabic:"النازعات",       name_transliteration:"An-Nazi'at",     name_translation_id:"Malaikat yang Mencabut",       name_translation_en:"Those Who Drag Forth",              juz_start:30, total_ayah:46,  revelation_type:"makkiyah"},
  {number:80, name_arabic:"عبس",            name_transliteration:"'Abasa",         name_translation_id:"Bermuka Masam",                name_translation_en:"He Frowned",                        juz_start:30, total_ayah:42,  revelation_type:"makkiyah"},
  {number:81, name_arabic:"التكوير",        name_transliteration:"At-Takwir",      name_translation_id:"Penggulungan",                 name_translation_en:"The Overthrowing",                  juz_start:30, total_ayah:29,  revelation_type:"makkiyah"},
  {number:82, name_arabic:"الانفطار",       name_transliteration:"Al-Infitar",     name_translation_id:"Terbelah",                     name_translation_en:"The Cleaving",                      juz_start:30, total_ayah:19,  revelation_type:"makkiyah"},
  {number:83, name_arabic:"المطففين",       name_transliteration:"Al-Mutaffifin",  name_translation_id:"Orang-Orang yang Curang",      name_translation_en:"The Defrauding",                    juz_start:30, total_ayah:36,  revelation_type:"makkiyah"},
  {number:84, name_arabic:"الانشقاق",       name_transliteration:"Al-Insyiqaq",    name_translation_id:"Terbelah",                     name_translation_en:"The Splitting Open",                juz_start:30, total_ayah:25,  revelation_type:"makkiyah"},
  {number:85, name_arabic:"البروج",         name_transliteration:"Al-Buruj",       name_translation_id:"Gugusan Bintang",              name_translation_en:"The Mansions of the Stars",         juz_start:30, total_ayah:22,  revelation_type:"makkiyah"},
  {number:86, name_arabic:"الطارق",         name_transliteration:"At-Tariq",       name_translation_id:"Yang Datang di Malam Hari",    name_translation_en:"The Morning Star",                  juz_start:30, total_ayah:17,  revelation_type:"makkiyah"},
  {number:87, name_arabic:"الأعلى",         name_transliteration:"Al-A'la",        name_translation_id:"Yang Paling Tinggi",           name_translation_en:"The Most High",                     juz_start:30, total_ayah:19,  revelation_type:"makkiyah"},
  {number:88, name_arabic:"الغاشية",        name_transliteration:"Al-Ghasyiyah",   name_translation_id:"Hari Pembalasan",              name_translation_en:"The Overwhelming",                  juz_start:30, total_ayah:26,  revelation_type:"makkiyah"},
  {number:89, name_arabic:"الفجر",          name_transliteration:"Al-Fajr",        name_translation_id:"Fajar",                        name_translation_en:"The Dawn",                          juz_start:30, total_ayah:30,  revelation_type:"makkiyah"},
  {number:90, name_arabic:"البلد",          name_transliteration:"Al-Balad",       name_translation_id:"Negeri",                       name_translation_en:"The City",                          juz_start:30, total_ayah:20,  revelation_type:"makkiyah"},
  {number:91, name_arabic:"الشمس",          name_transliteration:"Asy-Syams",      name_translation_id:"Matahari",                     name_translation_en:"The Sun",                           juz_start:30, total_ayah:15,  revelation_type:"makkiyah"},
  {number:92, name_arabic:"الليل",          name_transliteration:"Al-Lail",        name_translation_id:"Malam",                        name_translation_en:"The Night",                         juz_start:30, total_ayah:21,  revelation_type:"makkiyah"},
  {number:93, name_arabic:"الضحى",          name_transliteration:"Ad-Duha",        name_translation_id:"Waktu Dhuha",                  name_translation_en:"The Morning Hours",                 juz_start:30, total_ayah:11,  revelation_type:"makkiyah"},
  {number:94, name_arabic:"الشرح",          name_transliteration:"Asy-Syarh",      name_translation_id:"Lapang Dada",                  name_translation_en:"The Relief",                        juz_start:30, total_ayah:8,   revelation_type:"makkiyah"},
  {number:95, name_arabic:"التين",          name_transliteration:"At-Tin",         name_translation_id:"Buah Tin",                     name_translation_en:"The Fig",                           juz_start:30, total_ayah:8,   revelation_type:"makkiyah"},
  {number:96, name_arabic:"العلق",          name_transliteration:"Al-'Alaq",       name_translation_id:"Segumpal Darah",               name_translation_en:"The Clot",                          juz_start:30, total_ayah:19,  revelation_type:"makkiyah"},
  {number:97, name_arabic:"القدر",          name_transliteration:"Al-Qadr",        name_translation_id:"Kemuliaan",                    name_translation_en:"The Power",                         juz_start:30, total_ayah:5,   revelation_type:"makkiyah"},
  {number:98, name_arabic:"البينة",         name_transliteration:"Al-Bayyinah",    name_translation_id:"Bukti",                        name_translation_en:"The Clear Proof",                   juz_start:30, total_ayah:8,   revelation_type:"madaniyah"},
  {number:99, name_arabic:"الزلزلة",        name_transliteration:"Az-Zalzalah",    name_translation_id:"Goncangan",                    name_translation_en:"The Earthquake",                    juz_start:30, total_ayah:8,   revelation_type:"madaniyah"},
  {number:100,name_arabic:"العاديات",       name_transliteration:"Al-'Adiyat",     name_translation_id:"Kuda Perang",                  name_translation_en:"The Courser",                       juz_start:30, total_ayah:11,  revelation_type:"makkiyah"},
  {number:101,name_arabic:"القارعة",        name_transliteration:"Al-Qari'ah",     name_translation_id:"Hari Kiamat",                  name_translation_en:"The Calamity",                      juz_start:30, total_ayah:11,  revelation_type:"makkiyah"},
  {number:102,name_arabic:"التكاثر",        name_transliteration:"At-Takasur",     name_translation_id:"Bermegah-Megahan",             name_translation_en:"Rivalry in World Increase",         juz_start:30, total_ayah:8,   revelation_type:"makkiyah"},
  {number:103,name_arabic:"العصر",          name_transliteration:"Al-'Asr",        name_translation_id:"Masa",                         name_translation_en:"The Declining Day",                 juz_start:30, total_ayah:3,   revelation_type:"makkiyah"},
  {number:104,name_arabic:"الهمزة",         name_transliteration:"Al-Humazah",     name_translation_id:"Pengumpat",                    name_translation_en:"The Traducer",                      juz_start:30, total_ayah:9,   revelation_type:"makkiyah"},
  {number:105,name_arabic:"الفيل",          name_transliteration:"Al-Fil",         name_translation_id:"Gajah",                        name_translation_en:"The Elephant",                      juz_start:30, total_ayah:5,   revelation_type:"makkiyah"},
  {number:106,name_arabic:"قريش",           name_transliteration:"Quraisy",        name_translation_id:"Suku Quraisy",                 name_translation_en:"Quraysh",                           juz_start:30, total_ayah:4,   revelation_type:"makkiyah"},
  {number:107,name_arabic:"الماعون",        name_transliteration:"Al-Ma'un",       name_translation_id:"Barang yang Berguna",          name_translation_en:"The Small Kindnesses",              juz_start:30, total_ayah:7,   revelation_type:"makkiyah"},
  {number:108,name_arabic:"الكوثر",         name_transliteration:"Al-Kausar",      name_translation_id:"Nikmat yang Berlimpah",        name_translation_en:"The Abundance",                     juz_start:30, total_ayah:3,   revelation_type:"makkiyah"},
  {number:109,name_arabic:"الكافرون",       name_transliteration:"Al-Kafirun",     name_translation_id:"Orang-Orang Kafir",            name_translation_en:"The Disbelievers",                  juz_start:30, total_ayah:6,   revelation_type:"makkiyah"},
  {number:110,name_arabic:"النصر",          name_transliteration:"An-Nasr",        name_translation_id:"Pertolongan",                  name_translation_en:"The Divine Support",                juz_start:30, total_ayah:3,   revelation_type:"madaniyah"},
  {number:111,name_arabic:"المسد",          name_transliteration:"Al-Masad",       name_translation_id:"Garis-Garis",                  name_translation_en:"The Palm Fiber",                    juz_start:30, total_ayah:5,   revelation_type:"makkiyah"},
  {number:112,name_arabic:"الإخلاص",        name_transliteration:"Al-Ikhlas",      name_translation_id:"Ikhlas",                       name_translation_en:"The Sincerity",                     juz_start:30, total_ayah:4,   revelation_type:"makkiyah"},
  {number:113,name_arabic:"الفلق",          name_transliteration:"Al-Falaq",       name_translation_id:"Waktu Subuh",                  name_translation_en:"The Daybreak",                      juz_start:30, total_ayah:5,   revelation_type:"makkiyah"},
  {number:114,name_arabic:"الناس",          name_transliteration:"An-Nas",         name_translation_id:"Manusia",                      name_translation_en:"Mankind",                           juz_start:30, total_ayah:6,   revelation_type:"makkiyah"},
]

// ─── 2. AUDIO URL BUILDER ────────────────────────────────────
// Menggunakan CDN EveryAyah (Maqdis / Mishary) — URL publik, gratis
// Format: https://everyayah.com/data/Maqdis_Murattal_64kbps/SSSAAA.mp3
// SSS = nomor surah 3 digit, AAA = nomor ayat 3 digit
function audioUrl(surahNumber, ayahNumber) {
  const s = String(surahNumber).padStart(3, '0')
  const a = String(ayahNumber).padStart(3, '0')
  return `https://everyayah.com/data/Maqdis_Murattal_64kbps/${s}${a}.mp3`
}

// ─── 3. MAIN SEED FUNCTION ───────────────────────────────────
async function main() {
  console.log('🌱 Memulai seed database HAMIM...\n')

  // ── Seed Surahs ──────────────────────────────────────────
  console.log('📖 Seeding 114 surah...')
  let surahCount = 0
  for (const s of SURAHS) {
    await prisma.surah.upsert({
      where:  { number: s.number },
      update: {
        name_arabic: s.name_arabic,
        name_transliteration: s.name_transliteration,
        name_translation_id: s.name_translation_id,
        name_translation_en: s.name_translation_en,
        juz_start: s.juz_start,
        total_ayah: s.total_ayah,
        revelation_type: s.revelation_type,
      },
      create: s,
    })
    surahCount++
    if (surahCount % 20 === 0) process.stdout.write(`   ${surahCount}/114 surah...\r`)
  }
  console.log(` ${surahCount} surah selesai                      `)

  // ── Seed Ayahs + Audio Files ─────────────────────────────
  console.log('Seeding ayat dan audio...')
  let totalAyah = 0
  let totalAudio = 0

  for (const surahData of SURAHS) {
    // Ambil ID surah dari DB
    const surah = await prisma.surah.findUnique({ where: { number: surahData.number } })
    if (!surah) continue

    for (let ayahNum = 1; ayahNum <= surahData.total_ayah; ayahNum++) {
      // Upsert ayah
      const ayah = await prisma.ayah.upsert({
        where: { surah_id_ayah_number: { surah_id: surah.id, ayah_number: ayahNum } },
        update: { juz_number: surahData.juz_start },
        create: {
          surah_id:     surah.id,
          ayah_number:  ayahNum,
          juz_number:   surahData.juz_start,
          // text_arabic & text_uthmani diisi placeholder — ganti dengan data Quran lengkap
          text_arabic:  `[${surahData.name_transliteration} : ${ayahNum}]`,
          text_uthmani: `[${surahData.name_transliteration} : ${ayahNum}]`,
        },
      })
      totalAyah++

      // Upsert audio file (1 per ayah, qari Maqdis)
      const url = audioUrl(surahData.number, ayahNum)
      const existing = await prisma.audioFile.findFirst({
        where: { ayah_id: ayah.id, qari_name: 'Maqdis' }
      })
      if (!existing) {
        await prisma.audioFile.create({
          data: {
            ayah_id:   ayah.id,
            qari_name: 'Maqdis',
            file_url:  url,
          },
        })
        totalAudio++
      }
    }

    process.stdout.write(`   Surah ${surahData.number}/114 (${surahData.name_transliteration})...\r`)
  }

  console.log(`   ✅ ${totalAyah} ayat + ${totalAudio} audio files selesai`)

  console.log('\n🎉 Seed selesai!')
  console.log(`   Surah : 114`)
  console.log(`   Ayat  : ${totalAyah}`)
  console.log(`   Audio : ${totalAudio}`)
  console.log('\n⚠️  PENTING: field text_arabic & text_uthmani masih berupa placeholder.')
  console.log('   Ganti dengan data teks Al-Quran yang benar sebelum production.\n')
}

main()
  .catch((e) => { console.error('❌ Seed gagal:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
