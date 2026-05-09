/**
 * Algerian Wilayas with Communes and Postal Codes
 * Auto-generated from https://github.com/othmanus/algeria-cities
 */

export interface Commune {
    name: string;
    postCode: string;
}

export interface Wilaya {
    id: string;
    name: string;
    arabicName?: string;
    communes: Commune[];
}

export const ALGERIA_LOCATIONS: Wilaya[] = [
  {
    "id": "01",
    "name": "Adrar",
    "communes": [
      {
        "name": "Adrar",
        "postCode": "01000"
      },
      {
        "name": "Akabli",
        "postCode": "01044"
      },
      {
        "name": "Aoulef",
        "postCode": "01003"
      },
      {
        "name": "Bouda",
        "postCode": "01023"
      },
      {
        "name": "Fenoughil",
        "postCode": "01008"
      },
      {
        "name": "In Zghmir",
        "postCode": "01047"
      },
      {
        "name": "Ouled Ahmed Timmi",
        "postCode": "01025"
      },
      {
        "name": "Reggane",
        "postCode": "01004"
      },
      {
        "name": "Sali",
        "postCode": "01009"
      },
      {
        "name": "Sebaa",
        "postCode": "01022"
      },
      {
        "name": "Tamantit",
        "postCode": "01021"
      },
      {
        "name": "Tamest",
        "postCode": "01020"
      },
      {
        "name": "Timekten",
        "postCode": "01041"
      },
      {
        "name": "Tit",
        "postCode": "01031"
      },
      {
        "name": "Tsabit",
        "postCode": "01011"
      },
      {
        "name": "Zaouiet Kounta",
        "postCode": "01007"
      }
    ]
  },
  {
    "id": "02",
    "name": "Chlef",
    "communes": [
      {
        "name": "Abou El Hassane",
        "postCode": "02018"
      },
      {
        "name": "Ain Merane",
        "postCode": "02004"
      },
      {
        "name": "Benairia",
        "postCode": "02039"
      },
      {
        "name": "Beni  Bouattab",
        "postCode": "02071"
      },
      {
        "name": "Beni Haoua",
        "postCode": "02017"
      },
      {
        "name": "Beni Rached",
        "postCode": "02035"
      },
      {
        "name": "Boukadir",
        "postCode": "02002"
      },
      {
        "name": "Bouzeghaia",
        "postCode": "02019"
      },
      {
        "name": "Breira",
        "postCode": "02070"
      },
      {
        "name": "Chettia",
        "postCode": "02007"
      },
      {
        "name": "Chlef",
        "postCode": "02000"
      },
      {
        "name": "Dahra",
        "postCode": "02032"
      },
      {
        "name": "El Hadjadj",
        "postCode": "02050"
      },
      {
        "name": "El Karimia",
        "postCode": "02008"
      },
      {
        "name": "El Marsa",
        "postCode": "02015"
      },
      {
        "name": "Harchoun",
        "postCode": "02031"
      },
      {
        "name": "Herenfa",
        "postCode": "02038"
      },
      {
        "name": "Labiod Medjadja",
        "postCode": "02073"
      },
      {
        "name": "Moussadek",
        "postCode": "02060"
      },
      {
        "name": "Oued Fodda",
        "postCode": "02001"
      },
      {
        "name": "Oued Goussine",
        "postCode": "02061"
      },
      {
        "name": "Oued Sly",
        "postCode": "02011"
      },
      {
        "name": "Ouled Abbes",
        "postCode": "02029"
      },
      {
        "name": "Ouled Ben Abdelkader",
        "postCode": "02037"
      },
      {
        "name": "Ouled Fares",
        "postCode": "02010"
      },
      {
        "name": "Oum Drou",
        "postCode": "02024"
      },
      {
        "name": "Sendjas",
        "postCode": "02025"
      },
      {
        "name": "Sidi Abderrahmane",
        "postCode": "02066"
      },
      {
        "name": "Sidi Akkacha",
        "postCode": "02009"
      },
      {
        "name": "Sobha",
        "postCode": "02030"
      },
      {
        "name": "Tadjena",
        "postCode": "02043"
      },
      {
        "name": "Talassa",
        "postCode": "02065"
      },
      {
        "name": "Taougrit",
        "postCode": "02012"
      },
      {
        "name": "Tenes",
        "postCode": "02006"
      },
      {
        "name": "Zeboudja",
        "postCode": "02014"
      }
    ]
  },
  {
    "id": "03",
    "name": "Laghouat",
    "communes": [
      {
        "name": "Aflou",
        "postCode": "03001"
      },
      {
        "name": "Ain Madhi",
        "postCode": "03012"
      },
      {
        "name": "Ain Sidi Ali",
        "postCode": "03028"
      },
      {
        "name": "Benacer Benchohra",
        "postCode": "03033"
      },
      {
        "name": "Brida",
        "postCode": "03005"
      },
      {
        "name": "El Assafia",
        "postCode": "03014"
      },
      {
        "name": "El Beidha",
        "postCode": "03013"
      },
      {
        "name": "El Ghicha",
        "postCode": "03023"
      },
      {
        "name": "El Haouaita",
        "postCode": "03040"
      },
      {
        "name": "Gueltat Sidi Saad",
        "postCode": "03025"
      },
      {
        "name": "Hadj Mechri",
        "postCode": "03038"
      },
      {
        "name": "Hassi Delaa",
        "postCode": "03022"
      },
      {
        "name": "Hassi R'mel",
        "postCode": "03004"
      },
      {
        "name": "Kheneg",
        "postCode": "03010"
      },
      {
        "name": "Ksar El Hirane",
        "postCode": "03003"
      },
      {
        "name": "Laghouat",
        "postCode": "03000"
      },
      {
        "name": "Oued M'zi",
        "postCode": "03041"
      },
      {
        "name": "Oued Morra",
        "postCode": "03027"
      },
      {
        "name": "Sebgag",
        "postCode": "03034"
      },
      {
        "name": "Sidi Bouzid",
        "postCode": "03024"
      },
      {
        "name": "Sidi Makhlouf",
        "postCode": "03019"
      },
      {
        "name": "Tadjemout",
        "postCode": "03007"
      },
      {
        "name": "Tadjrouna",
        "postCode": "03011"
      },
      {
        "name": "Taouiala",
        "postCode": "03026"
      }
    ]
  },
  {
    "id": "04",
    "name": "Oum El Bouaghi",
    "communes": [
      {
        "name": "Ain Babouche",
        "postCode": "04020"
      },
      {
        "name": "Ain Beida",
        "postCode": "04001"
      },
      {
        "name": "Ain Diss",
        "postCode": "04025"
      },
      {
        "name": "Ain Fekroun",
        "postCode": "04005"
      },
      {
        "name": "Ain Kercha",
        "postCode": "04006"
      },
      {
        "name": "Ain M'lila",
        "postCode": "04002"
      },
      {
        "name": "Ain Zitoun",
        "postCode": "04023"
      },
      {
        "name": "Behir Chergui",
        "postCode": "04026"
      },
      {
        "name": "Berriche",
        "postCode": "04022"
      },
      {
        "name": "Bir Chouhada",
        "postCode": "04021"
      },
      {
        "name": "Dhalaa",
        "postCode": "04008"
      },
      {
        "name": "El Amiria",
        "postCode": "04038"
      },
      {
        "name": "El Belala",
        "postCode": "04044"
      },
      {
        "name": "El Djazia",
        "postCode": "04040"
      },
      {
        "name": "El Fedjoudj Boughrara Sa",
        "postCode": "04042"
      },
      {
        "name": "El Harmilia",
        "postCode": "04032"
      },
      {
        "name": "Fkirina",
        "postCode": "04013"
      },
      {
        "name": "Hanchir Toumghani",
        "postCode": "04012"
      },
      {
        "name": "Ksar Sbahi",
        "postCode": "04018"
      },
      {
        "name": "Meskiana",
        "postCode": "04004"
      },
      {
        "name": "Oued Nini",
        "postCode": "04047"
      },
      {
        "name": "Ouled Gacem",
        "postCode": "04041"
      },
      {
        "name": "Ouled Hamla",
        "postCode": "04019"
      },
      {
        "name": "Ouled Zouai",
        "postCode": "04000"
      },
      {
        "name": "Oum El Bouaghi",
        "postCode": "04000"
      },
      {
        "name": "Rahia",
        "postCode": "04045"
      },
      {
        "name": "Sigus",
        "postCode": "04011"
      },
      {
        "name": "Souk Naamane",
        "postCode": "04010"
      },
      {
        "name": "Zorg",
        "postCode": "04024"
      }
    ]
  },
  {
    "id": "05",
    "name": "Batna",
    "communes": [
      {
        "name": "Ain Djasser",
        "postCode": "05032"
      },
      {
        "name": "Ain Touta",
        "postCode": "05002"
      },
      {
        "name": "Ain Yagout",
        "postCode": "05031"
      },
      {
        "name": "Arris",
        "postCode": "05007"
      },
      {
        "name": "Azil Abedelkader",
        "postCode": "05087"
      },
      {
        "name": "Barika",
        "postCode": "05001"
      },
      {
        "name": "Batna",
        "postCode": "05000"
      },
      {
        "name": "Beni Foudhala El Hakania",
        "postCode": "05141"
      },
      {
        "name": "Bitam",
        "postCode": "05045"
      },
      {
        "name": "Boulhilat",
        "postCode": "05062"
      },
      {
        "name": "Boumagueur",
        "postCode": "05057"
      },
      {
        "name": "Boumia",
        "postCode": "05104"
      },
      {
        "name": "Bouzina",
        "postCode": "05041"
      },
      {
        "name": "Chemora",
        "postCode": "05039"
      },
      {
        "name": "Chir",
        "postCode": "05038"
      },
      {
        "name": "Djerma",
        "postCode": "05105"
      },
      {
        "name": "Djezzar",
        "postCode": "05046"
      },
      {
        "name": "El Hassi",
        "postCode": "05116"
      },
      {
        "name": "El Madher",
        "postCode": "05015"
      },
      {
        "name": "Fesdis",
        "postCode": "05077"
      },
      {
        "name": "Foum Toub",
        "postCode": "05049"
      },
      {
        "name": "Ghassira",
        "postCode": "05043"
      },
      {
        "name": "Gosbat",
        "postCode": "05090"
      },
      {
        "name": "Guigba",
        "postCode": "05067"
      },
      {
        "name": "Hidoussa",
        "postCode": "05033"
      },
      {
        "name": "Ichemoul",
        "postCode": "05026"
      },
      {
        "name": "Inoughissen",
        "postCode": "05083"
      },
      {
        "name": "Kimmel",
        "postCode": "05079"
      },
      {
        "name": "Ksar Bellezma",
        "postCode": "05047"
      },
      {
        "name": "Larbaa",
        "postCode": "05000"
      },
      {
        "name": "Lazrou",
        "postCode": "05117"
      },
      {
        "name": "Lemcene",
        "postCode": "05000"
      },
      {
        "name": "M Doukal",
        "postCode": "05037"
      },
      {
        "name": "Maafa",
        "postCode": "05123"
      },
      {
        "name": "Menaa",
        "postCode": "05012"
      },
      {
        "name": "Merouana",
        "postCode": "05013"
      },
      {
        "name": "N Gaous",
        "postCode": "05004"
      },
      {
        "name": "Oued Chaaba",
        "postCode": "05054"
      },
      {
        "name": "Oued El Ma",
        "postCode": "05016"
      },
      {
        "name": "Oued Taga",
        "postCode": "05036"
      },
      {
        "name": "Ouled Ammar",
        "postCode": "05121"
      },
      {
        "name": "Ouled Aouf",
        "postCode": "05122"
      },
      {
        "name": "Ouled Fadel",
        "postCode": "05063"
      },
      {
        "name": "Ouled Sellem",
        "postCode": "05044"
      },
      {
        "name": "Ouled Si Slimane",
        "postCode": "05066"
      },
      {
        "name": "Ouyoun El Assafir",
        "postCode": "05069"
      },
      {
        "name": "Rahbat",
        "postCode": "05091"
      },
      {
        "name": "Ras El Aioun",
        "postCode": "05009"
      },
      {
        "name": "Sefiane",
        "postCode": "05064"
      },
      {
        "name": "Seggana",
        "postCode": "05027"
      },
      {
        "name": "Seriana",
        "postCode": "05025"
      },
      {
        "name": "T Kout",
        "postCode": "05020"
      },
      {
        "name": "Talkhamt",
        "postCode": "05000"
      },
      {
        "name": "Taxlent",
        "postCode": "05055"
      },
      {
        "name": "Tazoult",
        "postCode": "05011"
      },
      {
        "name": "Teniet El Abed",
        "postCode": "05035"
      },
      {
        "name": "Tighanimine",
        "postCode": "05060"
      },
      {
        "name": "Tigharghar",
        "postCode": "05059"
      },
      {
        "name": "Tilatou",
        "postCode": "05127"
      },
      {
        "name": "Timgad",
        "postCode": "05023"
      },
      {
        "name": "Zanet El Beida",
        "postCode": "05071"
      }
    ]
  },
  {
    "id": "06",
    "name": "Béjaïa",
    "communes": [
      {
        "name": "Adekar",
        "postCode": "06021"
      },
      {
        "name": "Ait R'zine",
        "postCode": "06013"
      },
      {
        "name": "Ait-Smail",
        "postCode": "06044"
      },
      {
        "name": "Akbou",
        "postCode": "06001"
      },
      {
        "name": "Akfadou",
        "postCode": "06025"
      },
      {
        "name": "Amalou",
        "postCode": "06034"
      },
      {
        "name": "Amizour",
        "postCode": "06008"
      },
      {
        "name": "Aokas",
        "postCode": "06007"
      },
      {
        "name": "Barbacha",
        "postCode": "06009"
      },
      {
        "name": "Bejaia",
        "postCode": "06000"
      },
      {
        "name": "Beni Djellil",
        "postCode": "06067"
      },
      {
        "name": "Beni K'sila",
        "postCode": "06027"
      },
      {
        "name": "Beni-Mallikeche",
        "postCode": "06039"
      },
      {
        "name": "Benimaouche",
        "postCode": "06024"
      },
      {
        "name": "Boudjellil",
        "postCode": "06018"
      },
      {
        "name": "Bouhamza",
        "postCode": "06031"
      },
      {
        "name": "Boukhelifa",
        "postCode": "06059"
      },
      {
        "name": "Chellata",
        "postCode": "06052"
      },
      {
        "name": "Chemini",
        "postCode": "06022"
      },
      {
        "name": "Darguina",
        "postCode": "06016"
      },
      {
        "name": "Dra El Caid",
        "postCode": "06070"
      },
      {
        "name": "El Kseur",
        "postCode": "06003"
      },
      {
        "name": "Fenaia Il Maten",
        "postCode": "06041"
      },
      {
        "name": "Feraoun",
        "postCode": "06033"
      },
      {
        "name": "Ighil-Ali",
        "postCode": "06014"
      },
      {
        "name": "Ighram",
        "postCode": "06048"
      },
      {
        "name": "Kendira",
        "postCode": "06032"
      },
      {
        "name": "Kherrata",
        "postCode": "06004"
      },
      {
        "name": "Leflaye",
        "postCode": "06043"
      },
      {
        "name": "M'cisna",
        "postCode": "06038"
      },
      {
        "name": "Melbou",
        "postCode": "06076"
      },
      {
        "name": "Oued Ghir",
        "postCode": "06017"
      },
      {
        "name": "Ouzellaguen",
        "postCode": "06010"
      },
      {
        "name": "Seddouk",
        "postCode": "06011"
      },
      {
        "name": "Sidi Ayad",
        "postCode": "06085"
      },
      {
        "name": "Sidi-Aich",
        "postCode": "06005"
      },
      {
        "name": "Smaoun",
        "postCode": "06020"
      },
      {
        "name": "Souk El Tenine",
        "postCode": "06012"
      },
      {
        "name": "Souk Oufella",
        "postCode": "06036"
      },
      {
        "name": "Tala Hamza",
        "postCode": "06066"
      },
      {
        "name": "Tamokra",
        "postCode": "06053"
      },
      {
        "name": "Tamridjet",
        "postCode": "06077"
      },
      {
        "name": "Taourit Ighil",
        "postCode": "06035"
      },
      {
        "name": "Taskriout",
        "postCode": "06015"
      },
      {
        "name": "Tazmalt",
        "postCode": "06006"
      },
      {
        "name": "Tibane",
        "postCode": "06087"
      },
      {
        "name": "Tichy",
        "postCode": "06023"
      },
      {
        "name": "Tifra",
        "postCode": "06028"
      },
      {
        "name": "Timezrit",
        "postCode": "06019"
      },
      {
        "name": "Tinebdar",
        "postCode": "06037"
      },
      {
        "name": "Tizi-N'berber",
        "postCode": "06058"
      },
      {
        "name": "Toudja",
        "postCode": "06030"
      }
    ]
  },
  {
    "id": "07",
    "name": "Biskra",
    "communes": [
      {
        "name": "Ain Naga",
        "postCode": "07039"
      },
      {
        "name": "Ain Zaatout",
        "postCode": "07013"
      },
      {
        "name": "Biskra",
        "postCode": "07000"
      },
      {
        "name": "Bordj Ben Azzouz",
        "postCode": "07021"
      },
      {
        "name": "Bouchakroun",
        "postCode": "07022"
      },
      {
        "name": "Branis",
        "postCode": "07023"
      },
      {
        "name": "Chetma",
        "postCode": "07024"
      },
      {
        "name": "Djemorah",
        "postCode": "07025"
      },
      {
        "name": "El Feidh",
        "postCode": "07026"
      },
      {
        "name": "El Ghrous",
        "postCode": "07027"
      },
      {
        "name": "El Hadjab",
        "postCode": "07037"
      },
      {
        "name": "El Haouch",
        "postCode": "07028"
      },
      {
        "name": "El Kantara",
        "postCode": "07008"
      },
      {
        "name": "El Outaya",
        "postCode": "07030"
      },
      {
        "name": "Foughala",
        "postCode": "07031"
      },
      {
        "name": "Khenguet Sidi Nadji",
        "postCode": "07032"
      },
      {
        "name": "Lichana",
        "postCode": "07009"
      },
      {
        "name": "Lioua",
        "postCode": "07033"
      },
      {
        "name": "M'chouneche",
        "postCode": "07010"
      },
      {
        "name": "M'lili",
        "postCode": "07068"
      },
      {
        "name": "Mekhadma",
        "postCode": "07034"
      },
      {
        "name": "Meziraa",
        "postCode": "07043"
      },
      {
        "name": "Oumache",
        "postCode": "07035"
      },
      {
        "name": "Ourlal",
        "postCode": "07011"
      },
      {
        "name": "Sidi Okba",
        "postCode": "07005"
      },
      {
        "name": "Tolga",
        "postCode": "07003"
      },
      {
        "name": "Zeribet El Oued",
        "postCode": "07012"
      }
    ]
  },
  {
    "id": "08",
    "name": "Béchar",
    "communes": [
      {
        "name": "Abadla",
        "postCode": "08003"
      },
      {
        "name": "Bechar",
        "postCode": "08000"
      },
      {
        "name": "Beni-Ounif",
        "postCode": "08010"
      },
      {
        "name": "Boukais",
        "postCode": "08034"
      },
      {
        "name": "Erg-Ferradj",
        "postCode": "08023"
      },
      {
        "name": "Kenadsa",
        "postCode": "08011"
      },
      {
        "name": "Lahmar",
        "postCode": "08026"
      },
      {
        "name": "Machraa-Houari-Boumediene",
        "postCode": "08027"
      },
      {
        "name": "Meridja",
        "postCode": "08041"
      },
      {
        "name": "Mogheul",
        "postCode": "08042"
      },
      {
        "name": "Tabelbala",
        "postCode": "08029"
      },
      {
        "name": "Taghit",
        "postCode": "08030"
      }
    ]
  },
  {
    "id": "09",
    "name": "Blida",
    "communes": [
      {
        "name": "Ain Romana",
        "postCode": "09023"
      },
      {
        "name": "Beni Mered",
        "postCode": "09003"
      },
      {
        "name": "Beni-Tamou",
        "postCode": "09024"
      },
      {
        "name": "Benkhelil",
        "postCode": "09025"
      },
      {
        "name": "Blida",
        "postCode": "09000"
      },
      {
        "name": "Bouarfa",
        "postCode": "09019"
      },
      {
        "name": "Boufarik",
        "postCode": "09001"
      },
      {
        "name": "Bougara",
        "postCode": "09008"
      },
      {
        "name": "Bouinan",
        "postCode": "09020"
      },
      {
        "name": "Chebli",
        "postCode": "09009"
      },
      {
        "name": "Chiffa",
        "postCode": "09010"
      },
      {
        "name": "Chrea",
        "postCode": "09027"
      },
      {
        "name": "Djebabra",
        "postCode": "09028"
      },
      {
        "name": "El-Affroun",
        "postCode": "09011"
      },
      {
        "name": "Guerrouaou",
        "postCode": "09029"
      },
      {
        "name": "Hammam Elouane",
        "postCode": "09030"
      },
      {
        "name": "Larbaa",
        "postCode": "09002"
      },
      {
        "name": "Meftah",
        "postCode": "09012"
      },
      {
        "name": "Mouzaia",
        "postCode": "09013"
      },
      {
        "name": "Oued  Djer",
        "postCode": "09032"
      },
      {
        "name": "Oued El Alleug",
        "postCode": "09014"
      },
      {
        "name": "Ouled Slama",
        "postCode": "09033"
      },
      {
        "name": "Ouled Yaich",
        "postCode": "09015"
      },
      {
        "name": "Souhane",
        "postCode": "09034"
      },
      {
        "name": "Soumaa",
        "postCode": "09022"
      }
    ]
  },
  {
    "id": "10",
    "name": "Bouira",
    "communes": [
      {
        "name": "Aghbalou",
        "postCode": "10007"
      },
      {
        "name": "Ahl El Ksar",
        "postCode": "10008"
      },
      {
        "name": "Ain El Hadjar",
        "postCode": "10031"
      },
      {
        "name": "Ain Laloui",
        "postCode": "10032"
      },
      {
        "name": "Ain Turk",
        "postCode": "10033"
      },
      {
        "name": "Ain-Bessem",
        "postCode": "10005"
      },
      {
        "name": "Ait Laaziz",
        "postCode": "10034"
      },
      {
        "name": "Aomar",
        "postCode": "10010"
      },
      {
        "name": "Ath Mansour",
        "postCode": "10011"
      },
      {
        "name": "Bechloul",
        "postCode": "10012"
      },
      {
        "name": "Bir Ghbalou",
        "postCode": "10013"
      },
      {
        "name": "Bordj Okhriss",
        "postCode": "10014"
      },
      {
        "name": "Bouderbala",
        "postCode": "10016"
      },
      {
        "name": "Bouira",
        "postCode": "10000"
      },
      {
        "name": "Boukram",
        "postCode": "10054"
      },
      {
        "name": "Chorfa",
        "postCode": "10019"
      },
      {
        "name": "Dechmia",
        "postCode": "10057"
      },
      {
        "name": "Dirah",
        "postCode": "10020"
      },
      {
        "name": "Djebahia",
        "postCode": "10036"
      },
      {
        "name": "El Adjiba",
        "postCode": "10021"
      },
      {
        "name": "El Asnam",
        "postCode": "10022"
      },
      {
        "name": "El Hachimia",
        "postCode": "10023"
      },
      {
        "name": "El Khabouzia",
        "postCode": "10038"
      },
      {
        "name": "El-Hakimia",
        "postCode": "10058"
      },
      {
        "name": "El-Mokrani",
        "postCode": "10060"
      },
      {
        "name": "Guerrouma",
        "postCode": "10037"
      },
      {
        "name": "Hadjera Zerga",
        "postCode": "10065"
      },
      {
        "name": "Haizer",
        "postCode": "10024"
      },
      {
        "name": "Hanif",
        "postCode": "10030"
      },
      {
        "name": "Kadiria",
        "postCode": "10006"
      },
      {
        "name": "Lakhdaria",
        "postCode": "10002"
      },
      {
        "name": "M Chedallah",
        "postCode": "10003"
      },
      {
        "name": "Maala",
        "postCode": "10039"
      },
      {
        "name": "Maamora",
        "postCode": "10071"
      },
      {
        "name": "Mezdour",
        "postCode": "10040"
      },
      {
        "name": "Oued El Berdi",
        "postCode": "10075"
      },
      {
        "name": "Ouled Rached",
        "postCode": "10000"
      },
      {
        "name": "Raouraoua",
        "postCode": "10042"
      },
      {
        "name": "Ridane",
        "postCode": "10083"
      },
      {
        "name": "Saharidj",
        "postCode": "10043"
      },
      {
        "name": "Souk El Khemis",
        "postCode": "10044"
      },
      {
        "name": "Sour El Ghozlane",
        "postCode": "10004"
      },
      {
        "name": "Taghzout",
        "postCode": "10055"
      },
      {
        "name": "Taguedite",
        "postCode": "10045"
      },
      {
        "name": "Z'barbar (El Isseri )",
        "postCode": "10047"
      }
    ]
  },
  {
    "id": "11",
    "name": "Tamanrasset",
    "communes": [
      {
        "name": "Abelsa",
        "postCode": "11007"
      },
      {
        "name": "Ain Amguel",
        "postCode": "11003"
      },
      {
        "name": "Idles",
        "postCode": "11013"
      },
      {
        "name": "Tamanrasset",
        "postCode": "11000"
      },
      {
        "name": "Tazrouk",
        "postCode": "11010"
      }
    ]
  },
  {
    "id": "12",
    "name": "Tébessa",
    "communes": [
      {
        "name": "Ain Zerga",
        "postCode": "12008"
      },
      {
        "name": "Bedjene",
        "postCode": "12035"
      },
      {
        "name": "Bekkaria",
        "postCode": "12019"
      },
      {
        "name": "Bir Dheheb",
        "postCode": "12031"
      },
      {
        "name": "Bir Mokkadem",
        "postCode": "12011"
      },
      {
        "name": "Bir-El-Ater",
        "postCode": "12001"
      },
      {
        "name": "Boukhadra",
        "postCode": "12012"
      },
      {
        "name": "Boulhaf Dyr",
        "postCode": "12039"
      },
      {
        "name": "Cheria",
        "postCode": "12002"
      },
      {
        "name": "El Kouif",
        "postCode": "12006"
      },
      {
        "name": "El Malabiod",
        "postCode": "12014"
      },
      {
        "name": "El Meridj",
        "postCode": "12023"
      },
      {
        "name": "El Mezeraa",
        "postCode": "12042"
      },
      {
        "name": "El Ogla",
        "postCode": "12015"
      },
      {
        "name": "El Ogla El Malha",
        "postCode": "12043"
      },
      {
        "name": "El-Aouinet",
        "postCode": "12005"
      },
      {
        "name": "El-Houidjbet",
        "postCode": "12038"
      },
      {
        "name": "Ferkane",
        "postCode": "12044"
      },
      {
        "name": "Guorriguer",
        "postCode": "12046"
      },
      {
        "name": "Hammamet",
        "postCode": "12016"
      },
      {
        "name": "Morsott",
        "postCode": "12017"
      },
      {
        "name": "Negrine",
        "postCode": "12024"
      },
      {
        "name": "Ouenza",
        "postCode": "12003"
      },
      {
        "name": "Oum Ali",
        "postCode": "12027"
      },
      {
        "name": "Saf Saf El Ouesra",
        "postCode": "12037"
      },
      {
        "name": "Stah Guentis",
        "postCode": "12032"
      },
      {
        "name": "Tebessa",
        "postCode": "12000"
      },
      {
        "name": "Telidjen",
        "postCode": "12053"
      }
    ]
  },
  {
    "id": "13",
    "name": "Tlemcen",
    "communes": [
      {
        "name": "Ain Fetah",
        "postCode": "13028"
      },
      {
        "name": "Ain Fezza",
        "postCode": "13022"
      },
      {
        "name": "Ain Ghoraba",
        "postCode": "13023"
      },
      {
        "name": "Ain Kebira",
        "postCode": "13049"
      },
      {
        "name": "Ain Nehala",
        "postCode": "13054"
      },
      {
        "name": "Ain Tellout",
        "postCode": "13012"
      },
      {
        "name": "Ain Youcef",
        "postCode": "13013"
      },
      {
        "name": "Amieur",
        "postCode": "13058"
      },
      {
        "name": "Azail",
        "postCode": "13080"
      },
      {
        "name": "Bab El Assa",
        "postCode": "13014"
      },
      {
        "name": "Beni Bahdel",
        "postCode": "13060"
      },
      {
        "name": "Beni Boussaid",
        "postCode": "13000"
      },
      {
        "name": "Beni Khellad",
        "postCode": "13074"
      },
      {
        "name": "Beni Mester",
        "postCode": "13038"
      },
      {
        "name": "Beni Ouarsous",
        "postCode": "13025"
      },
      {
        "name": "Beni Smiel",
        "postCode": "13086"
      },
      {
        "name": "Beni Snous",
        "postCode": "13037"
      },
      {
        "name": "Bensekrane",
        "postCode": "13008"
      },
      {
        "name": "Bouhlou",
        "postCode": "13026"
      },
      {
        "name": "Bouihi",
        "postCode": "13030"
      },
      {
        "name": "Chetouane",
        "postCode": "13048"
      },
      {
        "name": "Dar Yaghmoracen",
        "postCode": "13032"
      },
      {
        "name": "Djebala",
        "postCode": "13029"
      },
      {
        "name": "El Aricha",
        "postCode": "13031"
      },
      {
        "name": "El Fehoul",
        "postCode": "13033"
      },
      {
        "name": "El Gor",
        "postCode": "13034"
      },
      {
        "name": "Fellaoucene",
        "postCode": "13035"
      },
      {
        "name": "Ghazaouet",
        "postCode": "13002"
      },
      {
        "name": "Hammam Boughrara",
        "postCode": "13036"
      },
      {
        "name": "Hennaya",
        "postCode": "13009"
      },
      {
        "name": "Honnaine",
        "postCode": "13015"
      },
      {
        "name": "M'sirda Fouaga",
        "postCode": "13024"
      },
      {
        "name": "Maghnia",
        "postCode": "13001"
      },
      {
        "name": "Mansourah",
        "postCode": "13062"
      },
      {
        "name": "Marsa Ben M'hidi",
        "postCode": "13017"
      },
      {
        "name": "Nedroma",
        "postCode": "13004"
      },
      {
        "name": "Oued Lakhdar",
        "postCode": "13068"
      },
      {
        "name": "Ouled Mimoun",
        "postCode": "13010"
      },
      {
        "name": "Ouled Riyah",
        "postCode": "13070"
      },
      {
        "name": "Remchi",
        "postCode": "13005"
      },
      {
        "name": "Sabra",
        "postCode": "13011"
      },
      {
        "name": "Sebbaa Chioukh",
        "postCode": "13042"
      },
      {
        "name": "Sebdou",
        "postCode": "13006"
      },
      {
        "name": "Sidi Abdelli",
        "postCode": "13019"
      },
      {
        "name": "Sidi Djillali",
        "postCode": "13043"
      },
      {
        "name": "Sidi Medjahed",
        "postCode": "13044"
      },
      {
        "name": "Souahlia",
        "postCode": "13020"
      },
      {
        "name": "Souani",
        "postCode": "13046"
      },
      {
        "name": "Souk Tleta",
        "postCode": "13078"
      },
      {
        "name": "Terny Beni Hediel",
        "postCode": "13079"
      },
      {
        "name": "Tianet",
        "postCode": "13047"
      },
      {
        "name": "Tlemcen",
        "postCode": "13000"
      },
      {
        "name": "Zenata",
        "postCode": "13051"
      }
    ]
  },
  {
    "id": "14",
    "name": "Tiaret",
    "communes": [
      {
        "name": "Ain Bouchekif",
        "postCode": "14040"
      },
      {
        "name": "Ain Deheb",
        "postCode": "14007"
      },
      {
        "name": "Ain Dzarit",
        "postCode": "14017"
      },
      {
        "name": "Ain El Hadid",
        "postCode": "14008"
      },
      {
        "name": "Ain Kermes",
        "postCode": "14009"
      },
      {
        "name": "Bougara",
        "postCode": "14018"
      },
      {
        "name": "Chehaima",
        "postCode": "14046"
      },
      {
        "name": "Dahmouni",
        "postCode": "14010"
      },
      {
        "name": "Djebilet Rosfa",
        "postCode": "14061"
      },
      {
        "name": "Djillali Ben Amar",
        "postCode": "14016"
      },
      {
        "name": "Faidja",
        "postCode": "14049"
      },
      {
        "name": "Frenda",
        "postCode": "14001"
      },
      {
        "name": "Guertoufa",
        "postCode": "14019"
      },
      {
        "name": "Hamadia",
        "postCode": "14020"
      },
      {
        "name": "Ksar Chellala",
        "postCode": "14002"
      },
      {
        "name": "Madna",
        "postCode": "14055"
      },
      {
        "name": "Mahdia",
        "postCode": "14004"
      },
      {
        "name": "Mechraa Safa",
        "postCode": "14012"
      },
      {
        "name": "Medrissa",
        "postCode": "14013"
      },
      {
        "name": "Medroussa",
        "postCode": "14023"
      },
      {
        "name": "Meghila",
        "postCode": "14024"
      },
      {
        "name": "Mellakou",
        "postCode": "14025"
      },
      {
        "name": "Nadorah",
        "postCode": "14058"
      },
      {
        "name": "Naima",
        "postCode": "14060"
      },
      {
        "name": "Oued Lilli",
        "postCode": "14014"
      },
      {
        "name": "Rahouia",
        "postCode": "14005"
      },
      {
        "name": "Rechaiga",
        "postCode": "14026"
      },
      {
        "name": "Sebaine",
        "postCode": "14030"
      },
      {
        "name": "Sebt",
        "postCode": "14000"
      },
      {
        "name": "Serghine",
        "postCode": "14051"
      },
      {
        "name": "Si Abdelghani",
        "postCode": "14027"
      },
      {
        "name": "Sidi Abderrahmane",
        "postCode": "14000"
      },
      {
        "name": "Sidi Ali Mellal",
        "postCode": "14064"
      },
      {
        "name": "Sidi Bakhti",
        "postCode": "14065"
      },
      {
        "name": "Sidi Hosni",
        "postCode": "14029"
      },
      {
        "name": "Sougueur",
        "postCode": "14003"
      },
      {
        "name": "Tagdempt",
        "postCode": "14068"
      },
      {
        "name": "Takhemaret",
        "postCode": "14015"
      },
      {
        "name": "Tiaret",
        "postCode": "14000"
      },
      {
        "name": "Tidda",
        "postCode": "14071"
      },
      {
        "name": "Tousnina",
        "postCode": "14037"
      },
      {
        "name": "Zmalet El Emir Abdelkade",
        "postCode": "14038"
      }
    ]
  },
  {
    "id": "15",
    "name": "Tizi Ouzou",
    "communes": [
      {
        "name": "Abi-Youcef",
        "postCode": "15000"
      },
      {
        "name": "Aghribs",
        "postCode": "15021"
      },
      {
        "name": "Agouni-Gueghrane",
        "postCode": "15022"
      },
      {
        "name": "Ain-El-Hammam",
        "postCode": "15002"
      },
      {
        "name": "Ain-Zaouia",
        "postCode": "15055"
      },
      {
        "name": "Ait Aggouacha",
        "postCode": "15058"
      },
      {
        "name": "Ait Bouaddou",
        "postCode": "15024"
      },
      {
        "name": "Ait Boumahdi",
        "postCode": "15084"
      },
      {
        "name": "Ait Khellili",
        "postCode": "15079"
      },
      {
        "name": "Ait Yahia Moussa",
        "postCode": "15026"
      },
      {
        "name": "Ait-Aissa-Mimoun",
        "postCode": "15032"
      },
      {
        "name": "Ait-Chafaa",
        "postCode": "15059"
      },
      {
        "name": "Ait-Mahmoud",
        "postCode": "15044"
      },
      {
        "name": "Ait-Oumalou",
        "postCode": "15000"
      },
      {
        "name": "Ait-Toudert",
        "postCode": "15062"
      },
      {
        "name": "Ait-Yahia",
        "postCode": "15072"
      },
      {
        "name": "Akbil",
        "postCode": "15092"
      },
      {
        "name": "Akerrou",
        "postCode": "15027"
      },
      {
        "name": "Assi-Youcef",
        "postCode": "15025"
      },
      {
        "name": "Azazga",
        "postCode": "15001"
      },
      {
        "name": "Azeffoun",
        "postCode": "15010"
      },
      {
        "name": "Beni Zmenzer",
        "postCode": "15028"
      },
      {
        "name": "Beni-Aissi",
        "postCode": "15069"
      },
      {
        "name": "Beni-Douala",
        "postCode": "15011"
      },
      {
        "name": "Beni-Yenni",
        "postCode": "15029"
      },
      {
        "name": "Beni-Zikki",
        "postCode": "15118"
      },
      {
        "name": "Boghni",
        "postCode": "15003"
      },
      {
        "name": "Boudjima",
        "postCode": "15030"
      },
      {
        "name": "Bounouh",
        "postCode": "15031"
      },
      {
        "name": "Bouzeguene",
        "postCode": "15009"
      },
      {
        "name": "Draa-Ben-Khedda",
        "postCode": "15004"
      },
      {
        "name": "Draa-El-Mizan",
        "postCode": "15005"
      },
      {
        "name": "Freha",
        "postCode": "15012"
      },
      {
        "name": "Frikat",
        "postCode": "15067"
      },
      {
        "name": "Iboudrarene",
        "postCode": "15073"
      },
      {
        "name": "Idjeur",
        "postCode": "15035"
      },
      {
        "name": "Iferhounene",
        "postCode": "15013"
      },
      {
        "name": "Ifigha",
        "postCode": "15034"
      },
      {
        "name": "Iflissen",
        "postCode": "15068"
      },
      {
        "name": "Illilten",
        "postCode": "15036"
      },
      {
        "name": "Illoula Oumalou",
        "postCode": "15037"
      },
      {
        "name": "Imsouhal",
        "postCode": "15023"
      },
      {
        "name": "Irdjen",
        "postCode": "15038"
      },
      {
        "name": "Larbaa Nath Irathen",
        "postCode": "15006"
      },
      {
        "name": "M'kira",
        "postCode": "15046"
      },
      {
        "name": "Maatkas",
        "postCode": "15017"
      },
      {
        "name": "Makouda",
        "postCode": "15040"
      },
      {
        "name": "Mechtras",
        "postCode": "15041"
      },
      {
        "name": "Mekla",
        "postCode": "15014"
      },
      {
        "name": "Mizrana",
        "postCode": "15061"
      },
      {
        "name": "Ouacif",
        "postCode": "15015"
      },
      {
        "name": "Ouadhias",
        "postCode": "15016"
      },
      {
        "name": "Ouaguenoun",
        "postCode": "15045"
      },
      {
        "name": "Sidi Namane",
        "postCode": "15042"
      },
      {
        "name": "Souama",
        "postCode": "15043"
      },
      {
        "name": "Souk-El-Tenine",
        "postCode": "15123"
      },
      {
        "name": "Tadmait",
        "postCode": "15018"
      },
      {
        "name": "Tigzirt",
        "postCode": "15019"
      },
      {
        "name": "Timizart",
        "postCode": "15039"
      },
      {
        "name": "Tirmitine",
        "postCode": "15048"
      },
      {
        "name": "Tizi N'tleta",
        "postCode": "15049"
      },
      {
        "name": "Tizi-Gheniff",
        "postCode": "15020"
      },
      {
        "name": "Tizi-Ouzou",
        "postCode": "15000"
      },
      {
        "name": "Tizi-Rached",
        "postCode": "15050"
      },
      {
        "name": "Yakourene",
        "postCode": "15051"
      },
      {
        "name": "Yatafene",
        "postCode": "15052"
      },
      {
        "name": "Zekri",
        "postCode": "15076"
      }
    ]
  },
  {
    "id": "16",
    "name": "Alger",
    "communes": [
      {
        "name": "Ain Benian",
        "postCode": "16018"
      },
      {
        "name": "Ain Taya",
        "postCode": "16019"
      },
      {
        "name": "Alger Centre",
        "postCode": "16000"
      },
      {
        "name": "Bab El Oued",
        "postCode": "16008"
      },
      {
        "name": "Bab Ezzouar",
        "postCode": "16024"
      },
      {
        "name": "Baba Hassen",
        "postCode": "16081"
      },
      {
        "name": "Bachedjerah",
        "postCode": "16026"
      },
      {
        "name": "Baraki",
        "postCode": "16027"
      },
      {
        "name": "Ben Aknoun",
        "postCode": "16028"
      },
      {
        "name": "Beni Messous",
        "postCode": "16044"
      },
      {
        "name": "Bir Mourad Rais",
        "postCode": "16013"
      },
      {
        "name": "Bir Touta",
        "postCode": "16045"
      },
      {
        "name": "Birkhadem",
        "postCode": "16029"
      },
      {
        "name": "Bologhine Ibnou Ziri",
        "postCode": "16030"
      },
      {
        "name": "Bordj El Bahri",
        "postCode": "16046"
      },
      {
        "name": "Bordj El Kiffan",
        "postCode": "16031"
      },
      {
        "name": "Bourouba",
        "postCode": "16054"
      },
      {
        "name": "Bouzareah",
        "postCode": "16032"
      },
      {
        "name": "Casbah",
        "postCode": "16001"
      },
      {
        "name": "Cheraga",
        "postCode": "16014"
      },
      {
        "name": "Dar El Beida",
        "postCode": "16033"
      },
      {
        "name": "Dely Ibrahim",
        "postCode": "16047"
      },
      {
        "name": "Djasr Kasentina",
        "postCode": "16173"
      },
      {
        "name": "Douira",
        "postCode": "16049"
      },
      {
        "name": "Draria",
        "postCode": "16050"
      },
      {
        "name": "El Achour",
        "postCode": "16104"
      },
      {
        "name": "El Biar",
        "postCode": "16003"
      },
      {
        "name": "El Harrach",
        "postCode": "16004"
      },
      {
        "name": "El Madania",
        "postCode": "16015"
      },
      {
        "name": "El Magharia",
        "postCode": "16053"
      },
      {
        "name": "El Marsa",
        "postCode": "16205"
      },
      {
        "name": "El Mouradia",
        "postCode": "16035"
      },
      {
        "name": "Hammamet",
        "postCode": "16082"
      },
      {
        "name": "Herraoua",
        "postCode": "16116"
      },
      {
        "name": "Hussein Dey",
        "postCode": "16005"
      },
      {
        "name": "Hydra",
        "postCode": "16016"
      },
      {
        "name": "Khraissia",
        "postCode": "16091"
      },
      {
        "name": "Kouba",
        "postCode": "16009"
      },
      {
        "name": "Les Eucalyptus",
        "postCode": "16057"
      },
      {
        "name": "Maalma",
        "postCode": "16093"
      },
      {
        "name": "Mohamed Belouzdad",
        "postCode": "16151"
      },
      {
        "name": "Mohammadia",
        "postCode": "16058"
      },
      {
        "name": "Oued Koriche",
        "postCode": "16182"
      },
      {
        "name": "Oued Smar",
        "postCode": "16059"
      },
      {
        "name": "Ouled Chebel",
        "postCode": "16118"
      },
      {
        "name": "Ouled Fayet",
        "postCode": "16094"
      },
      {
        "name": "Rahmania",
        "postCode": "16121"
      },
      {
        "name": "Rais Hamidou",
        "postCode": "16060"
      },
      {
        "name": "Reghaia",
        "postCode": "16036"
      },
      {
        "name": "Rouiba",
        "postCode": "16017"
      },
      {
        "name": "Sehaoula",
        "postCode": "16095"
      },
      {
        "name": "Sidi M'hamed",
        "postCode": "16002"
      },
      {
        "name": "Sidi Moussa",
        "postCode": "16189"
      },
      {
        "name": "Souidania",
        "postCode": "16097"
      },
      {
        "name": "Staoueli",
        "postCode": "16062"
      },
      {
        "name": "Tessala El Merdja",
        "postCode": "16099"
      },
      {
        "name": "Zeralda",
        "postCode": "16063"
      }
    ]
  },
  {
    "id": "17",
    "name": "Djelfa",
    "communes": [
      {
        "name": "Ain Chouhada",
        "postCode": "17039"
      },
      {
        "name": "Ain El Ibel",
        "postCode": "17011"
      },
      {
        "name": "Ain Fekka",
        "postCode": "17040"
      },
      {
        "name": "Ain Maabed",
        "postCode": "17025"
      },
      {
        "name": "Ain Oussera",
        "postCode": "17001"
      },
      {
        "name": "Amourah",
        "postCode": "17042"
      },
      {
        "name": "Benhar",
        "postCode": "17043"
      },
      {
        "name": "Benyagoub",
        "postCode": "17026"
      },
      {
        "name": "Birine",
        "postCode": "17014"
      },
      {
        "name": "Bouira Lahdab",
        "postCode": "17044"
      },
      {
        "name": "Charef",
        "postCode": "17015"
      },
      {
        "name": "Dar Chioukh",
        "postCode": "17006"
      },
      {
        "name": "Deldoul",
        "postCode": "17046"
      },
      {
        "name": "Djelfa",
        "postCode": "17000"
      },
      {
        "name": "Douis",
        "postCode": "17030"
      },
      {
        "name": "El Guedid",
        "postCode": "17019"
      },
      {
        "name": "El Idrissia",
        "postCode": "17020"
      },
      {
        "name": "El Khemis",
        "postCode": "17051"
      },
      {
        "name": "Faidh El Botma",
        "postCode": "17021"
      },
      {
        "name": "Guernini",
        "postCode": "17054"
      },
      {
        "name": "Guettara",
        "postCode": "17055"
      },
      {
        "name": "Had Sahary",
        "postCode": "17022"
      },
      {
        "name": "Hassi Bahbah",
        "postCode": "17002"
      },
      {
        "name": "Hassi El Euch",
        "postCode": "17032"
      },
      {
        "name": "Hassi Fedoul",
        "postCode": "17056"
      },
      {
        "name": "M'liliha",
        "postCode": "17036"
      },
      {
        "name": "Messaad",
        "postCode": "17003"
      },
      {
        "name": "Moudjebara",
        "postCode": "17058"
      },
      {
        "name": "Oum Laadham",
        "postCode": "17061"
      },
      {
        "name": "Sed Rahal",
        "postCode": "17062"
      },
      {
        "name": "Selmana",
        "postCode": "17063"
      },
      {
        "name": "Sidi Baizid",
        "postCode": "17052"
      },
      {
        "name": "Sidi Laadjel",
        "postCode": "17024"
      },
      {
        "name": "Taadmit",
        "postCode": "17037"
      },
      {
        "name": "Zaafrane",
        "postCode": "17038"
      },
      {
        "name": "Zaccar",
        "postCode": "17065"
      }
    ]
  },
  {
    "id": "18",
    "name": "Jijel",
    "communes": [
      {
        "name": "Bordj T'har",
        "postCode": "18041"
      },
      {
        "name": "Boudria Beniyadjis",
        "postCode": "18025"
      },
      {
        "name": "Bouraoui Belhadef",
        "postCode": "18023"
      },
      {
        "name": "Boussif Ouled Askeur",
        "postCode": "18036"
      },
      {
        "name": "Chahna",
        "postCode": "18027"
      },
      {
        "name": "Chekfa",
        "postCode": "18003"
      },
      {
        "name": "Djemaa Beni Habibi",
        "postCode": "18029"
      },
      {
        "name": "Djimla",
        "postCode": "18031"
      },
      {
        "name": "El Ancer",
        "postCode": "18004"
      },
      {
        "name": "El Aouana",
        "postCode": "18005"
      },
      {
        "name": "El Kennar Nouchfi",
        "postCode": "18030"
      },
      {
        "name": "El Milia",
        "postCode": "18001"
      },
      {
        "name": "Emir Abdelkader",
        "postCode": "18010"
      },
      {
        "name": "Erraguene Souissi",
        "postCode": "18032"
      },
      {
        "name": "Ghebala",
        "postCode": "18026"
      },
      {
        "name": "Jijel",
        "postCode": "18000"
      },
      {
        "name": "Kaous",
        "postCode": "18015"
      },
      {
        "name": "Khiri Oued Adjoul",
        "postCode": "18024"
      },
      {
        "name": "Oudjana",
        "postCode": "18047"
      },
      {
        "name": "Ouled Rabah",
        "postCode": "18046"
      },
      {
        "name": "Ouled Yahia Khadrouch",
        "postCode": "18021"
      },
      {
        "name": "Selma Benziada",
        "postCode": "18049"
      },
      {
        "name": "Settara",
        "postCode": "18016"
      },
      {
        "name": "Sidi Abdelaziz",
        "postCode": "18017"
      },
      {
        "name": "Sidi Marouf",
        "postCode": "18018"
      },
      {
        "name": "Taher",
        "postCode": "18002"
      },
      {
        "name": "Texenna",
        "postCode": "18006"
      },
      {
        "name": "Ziama Mansouriah",
        "postCode": "18007"
      }
    ]
  },
  {
    "id": "19",
    "name": "Sétif",
    "communes": [
      {
        "name": "Ain Abessa",
        "postCode": "19016"
      },
      {
        "name": "Ain Arnat",
        "postCode": "19017"
      },
      {
        "name": "Ain Azel",
        "postCode": "19007"
      },
      {
        "name": "Ain El Kebira",
        "postCode": "19008"
      },
      {
        "name": "Ain Lahdjar",
        "postCode": "19018"
      },
      {
        "name": "Ain Oulmene",
        "postCode": "19002"
      },
      {
        "name": "Ain-Legradj",
        "postCode": "19035"
      },
      {
        "name": "Ain-Roua",
        "postCode": "19019"
      },
      {
        "name": "Ain-Sebt",
        "postCode": "19033"
      },
      {
        "name": "Ait Naoual Mezada",
        "postCode": "19076"
      },
      {
        "name": "Ait-Tizi",
        "postCode": "19077"
      },
      {
        "name": "Amoucha",
        "postCode": "19009"
      },
      {
        "name": "Babor",
        "postCode": "19020"
      },
      {
        "name": "Bazer-Sakra",
        "postCode": "19036"
      },
      {
        "name": "Beidha Bordj",
        "postCode": "19021"
      },
      {
        "name": "Bellaa",
        "postCode": "19022"
      },
      {
        "name": "Beni Chebana",
        "postCode": "19031"
      },
      {
        "name": "Beni Fouda",
        "postCode": "19023"
      },
      {
        "name": "Beni Ourtilane",
        "postCode": "19011"
      },
      {
        "name": "Beni Oussine",
        "postCode": "19037"
      },
      {
        "name": "Beni-Aziz",
        "postCode": "19010"
      },
      {
        "name": "Beni-Mouhli",
        "postCode": "19038"
      },
      {
        "name": "Bir Haddada",
        "postCode": "19039"
      },
      {
        "name": "Bir-El-Arch",
        "postCode": "19024"
      },
      {
        "name": "Bouandas",
        "postCode": "19012"
      },
      {
        "name": "Bougaa",
        "postCode": "19003"
      },
      {
        "name": "Bousselam",
        "postCode": "19052"
      },
      {
        "name": "Boutaleb",
        "postCode": "19089"
      },
      {
        "name": "Dehamcha",
        "postCode": "19041"
      },
      {
        "name": "Djemila",
        "postCode": "19025"
      },
      {
        "name": "Draa-Kebila",
        "postCode": "19029"
      },
      {
        "name": "El Eulma",
        "postCode": "19001"
      },
      {
        "name": "El Ouricia",
        "postCode": "19047"
      },
      {
        "name": "El-Ouldja",
        "postCode": "19046"
      },
      {
        "name": "Guellal",
        "postCode": "19050"
      },
      {
        "name": "Guelta Zerka",
        "postCode": "19000"
      },
      {
        "name": "Guenzet",
        "postCode": "19026"
      },
      {
        "name": "Guidjel",
        "postCode": "19027"
      },
      {
        "name": "Hamam Soukhna",
        "postCode": "19059"
      },
      {
        "name": "Hamma",
        "postCode": "19015"
      },
      {
        "name": "Hammam Guergour",
        "postCode": "19051"
      },
      {
        "name": "Harbil",
        "postCode": "19032"
      },
      {
        "name": "Kasr El Abtal",
        "postCode": "19054"
      },
      {
        "name": "Maaouia",
        "postCode": "19055"
      },
      {
        "name": "Maouaklane",
        "postCode": "19028"
      },
      {
        "name": "Mezloug",
        "postCode": "19056"
      },
      {
        "name": "Oued El Bared",
        "postCode": "19115"
      },
      {
        "name": "Ouled Addouane",
        "postCode": "19053"
      },
      {
        "name": "Ouled Sabor",
        "postCode": "19120"
      },
      {
        "name": "Ouled Si Ahmed",
        "postCode": "19121"
      },
      {
        "name": "Ouled Tebben",
        "postCode": "19030"
      },
      {
        "name": "Rosfa",
        "postCode": "19060"
      },
      {
        "name": "Salah Bey",
        "postCode": "19013"
      },
      {
        "name": "Serdj-El-Ghoul",
        "postCode": "19086"
      },
      {
        "name": "Setif",
        "postCode": "19000"
      },
      {
        "name": "Tachouda",
        "postCode": "19125"
      },
      {
        "name": "Tala-Ifacene",
        "postCode": "19069"
      },
      {
        "name": "Taya",
        "postCode": "19067"
      },
      {
        "name": "Tella",
        "postCode": "19087"
      },
      {
        "name": "Tizi N'bechar",
        "postCode": "19068"
      }
    ]
  },
  {
    "id": "20",
    "name": "Saïda",
    "communes": [
      {
        "name": "Ain El Hadjar",
        "postCode": "20001"
      },
      {
        "name": "Ain Sekhouna",
        "postCode": "20009"
      },
      {
        "name": "Ain Soltane",
        "postCode": "20029"
      },
      {
        "name": "Doui Thabet",
        "postCode": "20023"
      },
      {
        "name": "El Hassasna",
        "postCode": "20003"
      },
      {
        "name": "Hounet",
        "postCode": "20025"
      },
      {
        "name": "Maamora",
        "postCode": "20013"
      },
      {
        "name": "Moulay Larbi",
        "postCode": "20014"
      },
      {
        "name": "Ouled Brahim",
        "postCode": "20002"
      },
      {
        "name": "Ouled Khaled",
        "postCode": "20004"
      },
      {
        "name": "Saida",
        "postCode": "20000"
      },
      {
        "name": "Sidi Ahmed",
        "postCode": "20012"
      },
      {
        "name": "Sidi Amar",
        "postCode": "20019"
      },
      {
        "name": "Sidi Boubekeur",
        "postCode": "20007"
      },
      {
        "name": "Tircine",
        "postCode": "20035"
      },
      {
        "name": "Youb",
        "postCode": "20008"
      }
    ]
  },
  {
    "id": "21",
    "name": "Skikda",
    "communes": [
      {
        "name": "Ain Bouziane",
        "postCode": "21031"
      },
      {
        "name": "Ain Charchar",
        "postCode": "21006"
      },
      {
        "name": "Ain Kechra",
        "postCode": "21007"
      },
      {
        "name": "Ain Zouit",
        "postCode": "21051"
      },
      {
        "name": "Azzaba",
        "postCode": "21001"
      },
      {
        "name": "Bekkouche Lakhdar",
        "postCode": "21009"
      },
      {
        "name": "Ben Azzouz",
        "postCode": "21010"
      },
      {
        "name": "Beni Bechir",
        "postCode": "21033"
      },
      {
        "name": "Beni Oulbane",
        "postCode": "21011"
      },
      {
        "name": "Beni Zid",
        "postCode": "21016"
      },
      {
        "name": "Bin El Ouiden",
        "postCode": "21052"
      },
      {
        "name": "Bouchetata",
        "postCode": "21053"
      },
      {
        "name": "Cheraia",
        "postCode": "21030"
      },
      {
        "name": "Collo",
        "postCode": "21002"
      },
      {
        "name": "Djendel Saadi Mohamed",
        "postCode": "21037"
      },
      {
        "name": "El Arrouch",
        "postCode": "21003"
      },
      {
        "name": "El Ghedir",
        "postCode": "21057"
      },
      {
        "name": "El Hadaiek",
        "postCode": "21015"
      },
      {
        "name": "El Marsa",
        "postCode": "21058"
      },
      {
        "name": "Emjez Edchich",
        "postCode": "21017"
      },
      {
        "name": "Es Sebt",
        "postCode": "21018"
      },
      {
        "name": "Filfila",
        "postCode": "21042"
      },
      {
        "name": "Hammadi Krouma",
        "postCode": "21038"
      },
      {
        "name": "Kanoua",
        "postCode": "21062"
      },
      {
        "name": "Kerkara",
        "postCode": "21019"
      },
      {
        "name": "Khenag Maoune",
        "postCode": "21059"
      },
      {
        "name": "Oued Zhour",
        "postCode": "21040"
      },
      {
        "name": "Ouldja Boulbalout",
        "postCode": "21000"
      },
      {
        "name": "Ouled Attia",
        "postCode": "21012"
      },
      {
        "name": "Ouled Habbaba",
        "postCode": "21043"
      },
      {
        "name": "Oum Toub",
        "postCode": "21020"
      },
      {
        "name": "Ramdane Djamel",
        "postCode": "21004"
      },
      {
        "name": "Salah Bouchaour",
        "postCode": "21022"
      },
      {
        "name": "Sidi Mezghiche",
        "postCode": "21023"
      },
      {
        "name": "Skikda",
        "postCode": "21000"
      },
      {
        "name": "Tamalous",
        "postCode": "21005"
      },
      {
        "name": "Zerdezas",
        "postCode": "21047"
      },
      {
        "name": "Zitouna",
        "postCode": "21028"
      }
    ]
  },
  {
    "id": "22",
    "name": "Sidi Bel Abbès",
    "communes": [
      {
        "name": "Ain El Berd",
        "postCode": "22022"
      },
      {
        "name": "Ain Kada",
        "postCode": "22035"
      },
      {
        "name": "Ain Thrid",
        "postCode": "22037"
      },
      {
        "name": "Ain Tindamine",
        "postCode": "22036"
      },
      {
        "name": "Ain- Adden",
        "postCode": "22034"
      },
      {
        "name": "Amarnas",
        "postCode": "22074"
      },
      {
        "name": "Bedrabine El Mokrani",
        "postCode": "22038"
      },
      {
        "name": "Belarbi",
        "postCode": "22023"
      },
      {
        "name": "Ben Badis",
        "postCode": "22004"
      },
      {
        "name": "Benachiba Chelia",
        "postCode": "22040"
      },
      {
        "name": "Bir El Hammam",
        "postCode": "22041"
      },
      {
        "name": "Boudjebaa El Bordj",
        "postCode": "22043"
      },
      {
        "name": "Boukhanefis",
        "postCode": "22008"
      },
      {
        "name": "Chetouane Belaila",
        "postCode": "22039"
      },
      {
        "name": "Dhaya",
        "postCode": "22009"
      },
      {
        "name": "El Hacaiba",
        "postCode": "22047"
      },
      {
        "name": "Hassi Dahou",
        "postCode": "22049"
      },
      {
        "name": "Hassi Zahana",
        "postCode": "22010"
      },
      {
        "name": "Lamtar",
        "postCode": "22024"
      },
      {
        "name": "M'cid",
        "postCode": "22052"
      },
      {
        "name": "Makedra",
        "postCode": "22051"
      },
      {
        "name": "Marhoum",
        "postCode": "22011"
      },
      {
        "name": "Merine",
        "postCode": "22012"
      },
      {
        "name": "Mezaourou",
        "postCode": "22025"
      },
      {
        "name": "Mostefa  Ben Brahim",
        "postCode": "22013"
      },
      {
        "name": "Moulay Slissen",
        "postCode": "22026"
      },
      {
        "name": "Oued Sebaa",
        "postCode": "22054"
      },
      {
        "name": "Oued Sefioun",
        "postCode": "22055"
      },
      {
        "name": "Oued Taourira",
        "postCode": "22056"
      },
      {
        "name": "Ras El Ma",
        "postCode": "22069"
      },
      {
        "name": "Redjem Demouche",
        "postCode": "22058"
      },
      {
        "name": "Sehala Thaoura",
        "postCode": "22060"
      },
      {
        "name": "Sfisef",
        "postCode": "22001"
      },
      {
        "name": "Sidi Ali Benyoub",
        "postCode": "22028"
      },
      {
        "name": "Sidi Ali Boussidi",
        "postCode": "22014"
      },
      {
        "name": "Sidi Bel-Abbes",
        "postCode": "22000"
      },
      {
        "name": "Sidi Brahim",
        "postCode": "22029"
      },
      {
        "name": "Sidi Chaib",
        "postCode": "22061"
      },
      {
        "name": "Sidi Dahou Zairs",
        "postCode": "22062"
      },
      {
        "name": "Sidi Hamadouche",
        "postCode": "22019"
      },
      {
        "name": "Sidi Khaled",
        "postCode": "22000"
      },
      {
        "name": "Sidi Lahcene",
        "postCode": "22020"
      },
      {
        "name": "Sidi Yacoub",
        "postCode": "22063"
      },
      {
        "name": "Tabia",
        "postCode": "22032"
      },
      {
        "name": "Taoudmout",
        "postCode": "22064"
      },
      {
        "name": "Tefessour",
        "postCode": "22065"
      },
      {
        "name": "Teghalimet",
        "postCode": "22066"
      },
      {
        "name": "Telagh",
        "postCode": "22007"
      },
      {
        "name": "Tenira",
        "postCode": "22021"
      },
      {
        "name": "Tessala",
        "postCode": "22033"
      },
      {
        "name": "Tilmouni",
        "postCode": "22044"
      },
      {
        "name": "Zerouala",
        "postCode": "22068"
      }
    ]
  },
  {
    "id": "23",
    "name": "Annaba",
    "communes": [
      {
        "name": "Ain El Berda",
        "postCode": "23006"
      },
      {
        "name": "Annaba",
        "postCode": "23000"
      },
      {
        "name": "Berrahal",
        "postCode": "23009"
      },
      {
        "name": "Chetaibi",
        "postCode": "23014"
      },
      {
        "name": "Cheurfa",
        "postCode": "23025"
      },
      {
        "name": "El Bouni",
        "postCode": "23010"
      },
      {
        "name": "El Eulma",
        "postCode": "23000"
      },
      {
        "name": "El Hadjar",
        "postCode": "23004"
      },
      {
        "name": "Oued El Aneb",
        "postCode": "23021"
      },
      {
        "name": "Seraidi",
        "postCode": "23015"
      },
      {
        "name": "Sidi Amar",
        "postCode": "23028"
      },
      {
        "name": "Treat",
        "postCode": "23000"
      }
    ]
  },
  {
    "id": "24",
    "name": "Guelma",
    "communes": [
      {
        "name": "Ain Ben Beida",
        "postCode": "24011"
      },
      {
        "name": "Ain Larbi",
        "postCode": "24012"
      },
      {
        "name": "Ain Makhlouf",
        "postCode": "24013"
      },
      {
        "name": "Ain Regada",
        "postCode": "24014"
      },
      {
        "name": "Ain Sandel",
        "postCode": "24032"
      },
      {
        "name": "Belkheir",
        "postCode": "24015"
      },
      {
        "name": "Bendjarah",
        "postCode": "24034"
      },
      {
        "name": "Beni Mezline",
        "postCode": "24000"
      },
      {
        "name": "Bordj Sabath",
        "postCode": "24017"
      },
      {
        "name": "Bou Hachana",
        "postCode": "24037"
      },
      {
        "name": "Bou Hamdane",
        "postCode": "24000"
      },
      {
        "name": "Bouati Mahmoud",
        "postCode": "24018"
      },
      {
        "name": "Bouchegouf",
        "postCode": "24002"
      },
      {
        "name": "Boumahra Ahmed",
        "postCode": "24005"
      },
      {
        "name": "Dahouara",
        "postCode": "24031"
      },
      {
        "name": "Djeballah Khemissi",
        "postCode": "24039"
      },
      {
        "name": "El Fedjoudj",
        "postCode": "24019"
      },
      {
        "name": "Guelaat Bou Sbaa",
        "postCode": "24020"
      },
      {
        "name": "Guelma",
        "postCode": "24000"
      },
      {
        "name": "Hammam Debagh",
        "postCode": "24007"
      },
      {
        "name": "Hammam N'bail",
        "postCode": "24024"
      },
      {
        "name": "Heliopolis",
        "postCode": "24008"
      },
      {
        "name": "Houari Boumedienne",
        "postCode": "24025"
      },
      {
        "name": "Khezaras",
        "postCode": "24000"
      },
      {
        "name": "Medjez Amar",
        "postCode": "24043"
      },
      {
        "name": "Medjez Sfa",
        "postCode": "24026"
      },
      {
        "name": "Nechmaya",
        "postCode": "24027"
      },
      {
        "name": "Oued Cheham",
        "postCode": "24009"
      },
      {
        "name": "Oued Ferragha",
        "postCode": "24038"
      },
      {
        "name": "Oued Zenati",
        "postCode": "24001"
      },
      {
        "name": "Ras El Agba",
        "postCode": "24049"
      },
      {
        "name": "Roknia",
        "postCode": "24028"
      },
      {
        "name": "Sellaoua Announa",
        "postCode": "24029"
      },
      {
        "name": "Tamlouka",
        "postCode": "24010"
      }
    ]
  },
  {
    "id": "25",
    "name": "Constantine",
    "communes": [
      {
        "name": "Ain Abid",
        "postCode": "25015"
      },
      {
        "name": "Ain Smara",
        "postCode": "25006"
      },
      {
        "name": "Ben Badis",
        "postCode": "25037"
      },
      {
        "name": "Beni Hamidane",
        "postCode": "25035"
      },
      {
        "name": "Constantine",
        "postCode": "25000"
      },
      {
        "name": "Didouche Mourad",
        "postCode": "25024"
      },
      {
        "name": "El Khroub",
        "postCode": "25005"
      },
      {
        "name": "Hamma Bouziane",
        "postCode": "25013"
      },
      {
        "name": "Ibn Ziad",
        "postCode": "25027"
      },
      {
        "name": "Messaoud Boudjeriou",
        "postCode": "25032"
      },
      {
        "name": "Ouled Rahmoun",
        "postCode": "25028"
      },
      {
        "name": "Zighoud Youcef",
        "postCode": "25014"
      }
    ]
  },
  {
    "id": "26",
    "name": "Médéa",
    "communes": [
      {
        "name": "Ain Boucif",
        "postCode": "26005"
      },
      {
        "name": "Ain Ouksir",
        "postCode": "26048"
      },
      {
        "name": "Aissaouia",
        "postCode": "26022"
      },
      {
        "name": "Aziz",
        "postCode": "26040"
      },
      {
        "name": "Baata",
        "postCode": "26050"
      },
      {
        "name": "Ben Chicao",
        "postCode": "26012"
      },
      {
        "name": "Beni Slimane",
        "postCode": "26001"
      },
      {
        "name": "Berrouaghia",
        "postCode": "26002"
      },
      {
        "name": "Bir Ben Laabed",
        "postCode": "26053"
      },
      {
        "name": "Boghar",
        "postCode": "26013"
      },
      {
        "name": "Bouaiche",
        "postCode": "26000"
      },
      {
        "name": "Bouaichoune",
        "postCode": "26055"
      },
      {
        "name": "Bouchrahil",
        "postCode": "26014"
      },
      {
        "name": "Boughzoul",
        "postCode": "26023"
      },
      {
        "name": "Bouskene",
        "postCode": "26025"
      },
      {
        "name": "Chabounia",
        "postCode": "26026"
      },
      {
        "name": "Chelalet El Adhaoura",
        "postCode": "26007"
      },
      {
        "name": "Cheniguel",
        "postCode": "26057"
      },
      {
        "name": "Derrag",
        "postCode": "26015"
      },
      {
        "name": "Djouab",
        "postCode": "26016"
      },
      {
        "name": "Draa Esmar",
        "postCode": "26017"
      },
      {
        "name": "El Azizia",
        "postCode": "26018"
      },
      {
        "name": "El Guelbelkebir",
        "postCode": "26030"
      },
      {
        "name": "El Hamdania",
        "postCode": "26060"
      },
      {
        "name": "El Haoudane",
        "postCode": "26058"
      },
      {
        "name": "El Omaria",
        "postCode": "26008"
      },
      {
        "name": "El Ouinet",
        "postCode": "26000"
      },
      {
        "name": "Hannacha",
        "postCode": "26027"
      },
      {
        "name": "Kef Lakhdar",
        "postCode": "26051"
      },
      {
        "name": "Khams Djouamaa",
        "postCode": "26062"
      },
      {
        "name": "Ksar El Boukhari",
        "postCode": "26003"
      },
      {
        "name": "M'fatha",
        "postCode": "26049"
      },
      {
        "name": "Maghraoua",
        "postCode": "26063"
      },
      {
        "name": "Medea",
        "postCode": "26000"
      },
      {
        "name": "Medjebar",
        "postCode": "26033"
      },
      {
        "name": "Mezerana",
        "postCode": "26000"
      },
      {
        "name": "Mihoub",
        "postCode": "26032"
      },
      {
        "name": "Ouamri",
        "postCode": "26034"
      },
      {
        "name": "Oued Harbil",
        "postCode": "26061"
      },
      {
        "name": "Ouled Antar",
        "postCode": "26035"
      },
      {
        "name": "Ouled Bouachra",
        "postCode": "26064"
      },
      {
        "name": "Ouled Brahim",
        "postCode": "26036"
      },
      {
        "name": "Ouled Deid",
        "postCode": "26044"
      },
      {
        "name": "Ouled Emaaraf",
        "postCode": "26038"
      },
      {
        "name": "Ouled Hellal",
        "postCode": "26037"
      },
      {
        "name": "Oum El Djellil",
        "postCode": "26042"
      },
      {
        "name": "Ouzera",
        "postCode": "26019"
      },
      {
        "name": "Rebaia",
        "postCode": "26039"
      },
      {
        "name": "Saneg",
        "postCode": "26067"
      },
      {
        "name": "Sedraya",
        "postCode": "26068"
      },
      {
        "name": "Seghouane",
        "postCode": "26041"
      },
      {
        "name": "Si Mahdjoub",
        "postCode": "26045"
      },
      {
        "name": "Sidi Demed",
        "postCode": "26069"
      },
      {
        "name": "Sidi Naamane",
        "postCode": "26071"
      },
      {
        "name": "Sidi Rabie",
        "postCode": "26070"
      },
      {
        "name": "Sidi Zahar",
        "postCode": "26072"
      },
      {
        "name": "Sidi Ziane",
        "postCode": "26000"
      },
      {
        "name": "Souagui",
        "postCode": "26020"
      },
      {
        "name": "Tablat",
        "postCode": "26004"
      },
      {
        "name": "Tafraout",
        "postCode": "26074"
      },
      {
        "name": "Tamesguida",
        "postCode": "26075"
      },
      {
        "name": "Tizi Mahdi",
        "postCode": "26076"
      },
      {
        "name": "Tletat Ed Douair",
        "postCode": "26046"
      },
      {
        "name": "Zoubiria",
        "postCode": "26021"
      }
    ]
  },
  {
    "id": "27",
    "name": "Mostaganem",
    "communes": [
      {
        "name": "Achaacha",
        "postCode": "27009"
      },
      {
        "name": "Ain-Boudinar",
        "postCode": "27031"
      },
      {
        "name": "Ain-Nouissy",
        "postCode": "27010"
      },
      {
        "name": "Ain-Sidi Cherif",
        "postCode": "27024"
      },
      {
        "name": "Ain-Tedles",
        "postCode": "27001"
      },
      {
        "name": "Benabdelmalek Ramdane",
        "postCode": "27008"
      },
      {
        "name": "Bouguirat",
        "postCode": "27003"
      },
      {
        "name": "Fornaka",
        "postCode": "27014"
      },
      {
        "name": "Hadjadj",
        "postCode": "27015"
      },
      {
        "name": "Hassi Mameche",
        "postCode": "27004"
      },
      {
        "name": "Hassiane",
        "postCode": "27033"
      },
      {
        "name": "Khadra",
        "postCode": "27005"
      },
      {
        "name": "Kheir-Eddine",
        "postCode": "27016"
      },
      {
        "name": "Mansourah",
        "postCode": "27036"
      },
      {
        "name": "Mazagran",
        "postCode": "27017"
      },
      {
        "name": "Mesra",
        "postCode": "27018"
      },
      {
        "name": "Mostaganem",
        "postCode": "27000"
      },
      {
        "name": "Nekmaria",
        "postCode": "27026"
      },
      {
        "name": "Oued El Kheir",
        "postCode": "27020"
      },
      {
        "name": "Ouled Boughalem",
        "postCode": "27027"
      },
      {
        "name": "Ouled-Maalah",
        "postCode": "27028"
      },
      {
        "name": "Safsaf",
        "postCode": "27000"
      },
      {
        "name": "Sayada",
        "postCode": "27045"
      },
      {
        "name": "Sidi Ali",
        "postCode": "27032"
      },
      {
        "name": "Sidi Belaattar",
        "postCode": "27029"
      },
      {
        "name": "Sidi-Lakhdar",
        "postCode": "27007"
      },
      {
        "name": "Sirat",
        "postCode": "27021"
      },
      {
        "name": "Souaflia",
        "postCode": "27046"
      },
      {
        "name": "Sour",
        "postCode": "27022"
      },
      {
        "name": "Stidia",
        "postCode": "27023"
      },
      {
        "name": "Tazgait",
        "postCode": "27047"
      },
      {
        "name": "Touahria",
        "postCode": "27013"
      }
    ]
  },
  {
    "id": "28",
    "name": "M'Sila",
    "communes": [
      {
        "name": "Ain El Hadjel",
        "postCode": "28003"
      },
      {
        "name": "Ain El Melh",
        "postCode": "28004"
      },
      {
        "name": "Ain Fares",
        "postCode": "28023"
      },
      {
        "name": "Ain Khadra",
        "postCode": "28008"
      },
      {
        "name": "Ain Rich",
        "postCode": "28025"
      },
      {
        "name": "Belaiba",
        "postCode": "28026"
      },
      {
        "name": "Ben Srour",
        "postCode": "28009"
      },
      {
        "name": "Beni Ilmane",
        "postCode": "28027"
      },
      {
        "name": "Benzouh",
        "postCode": "28028"
      },
      {
        "name": "Berhoum",
        "postCode": "28010"
      },
      {
        "name": "Bir Foda",
        "postCode": "28043"
      },
      {
        "name": "Bou Saada",
        "postCode": "28001"
      },
      {
        "name": "Bouti Sayeh",
        "postCode": "28042"
      },
      {
        "name": "Chellal",
        "postCode": "28014"
      },
      {
        "name": "Dehahna",
        "postCode": "28048"
      },
      {
        "name": "Djebel Messaad",
        "postCode": "28024"
      },
      {
        "name": "El Hamel",
        "postCode": "28015"
      },
      {
        "name": "El Houamed",
        "postCode": "28000"
      },
      {
        "name": "Hammam Dalaa",
        "postCode": "28005"
      },
      {
        "name": "Khettouti Sed-El-Jir",
        "postCode": "28056"
      },
      {
        "name": "Khoubana",
        "postCode": "28030"
      },
      {
        "name": "M'cif",
        "postCode": "28029"
      },
      {
        "name": "M'sila",
        "postCode": "28000"
      },
      {
        "name": "M'tarfa",
        "postCode": "28000"
      },
      {
        "name": "Maadid",
        "postCode": "28011"
      },
      {
        "name": "Maarif",
        "postCode": "28041"
      },
      {
        "name": "Magra",
        "postCode": "28006"
      },
      {
        "name": "Medjedel",
        "postCode": "28016"
      },
      {
        "name": "Menaa",
        "postCode": "28000"
      },
      {
        "name": "Mohamed Boudiaf",
        "postCode": "28033"
      },
      {
        "name": "Ouanougha",
        "postCode": "28017"
      },
      {
        "name": "Ouled Addi Guebala",
        "postCode": "28021"
      },
      {
        "name": "Ouled Derradj",
        "postCode": "28022"
      },
      {
        "name": "Ouled Madhi",
        "postCode": "28047"
      },
      {
        "name": "Ouled Mansour",
        "postCode": "28060"
      },
      {
        "name": "Ouled Sidi Brahim",
        "postCode": "28032"
      },
      {
        "name": "Ouled Slimane",
        "postCode": "28031"
      },
      {
        "name": "Oulteme",
        "postCode": "28054"
      },
      {
        "name": "Sidi Aissa",
        "postCode": "28002"
      },
      {
        "name": "Sidi Ameur",
        "postCode": "28000"
      },
      {
        "name": "Sidi Hadjeres",
        "postCode": "28036"
      },
      {
        "name": "Sidi M'hamed",
        "postCode": "28045"
      },
      {
        "name": "Slim",
        "postCode": "28037"
      },
      {
        "name": "Souamaa",
        "postCode": "28064"
      },
      {
        "name": "Tamsa",
        "postCode": "28065"
      },
      {
        "name": "Tarmount",
        "postCode": "28038"
      },
      {
        "name": "Zarzour",
        "postCode": "28067"
      }
    ]
  },
  {
    "id": "29",
    "name": "Mascara",
    "communes": [
      {
        "name": "Ain Fares",
        "postCode": "29000"
      },
      {
        "name": "Ain Fekan",
        "postCode": "29011"
      },
      {
        "name": "Ain Ferah",
        "postCode": "29032"
      },
      {
        "name": "Ain Frass",
        "postCode": "29034"
      },
      {
        "name": "Alaimia",
        "postCode": "29036"
      },
      {
        "name": "Aouf",
        "postCode": "29021"
      },
      {
        "name": "Benian",
        "postCode": "29038"
      },
      {
        "name": "Bou Henni",
        "postCode": "29022"
      },
      {
        "name": "Bouhanifia",
        "postCode": "29005"
      },
      {
        "name": "Chorfa",
        "postCode": "29039"
      },
      {
        "name": "El Bordj",
        "postCode": "29012"
      },
      {
        "name": "El Gaada",
        "postCode": "29041"
      },
      {
        "name": "El Ghomri",
        "postCode": "29023"
      },
      {
        "name": "El Gueitena",
        "postCode": "29042"
      },
      {
        "name": "El Hachem",
        "postCode": "29013"
      },
      {
        "name": "El Keurt",
        "postCode": "29043"
      },
      {
        "name": "El Mamounia",
        "postCode": "29056"
      },
      {
        "name": "El Menaouer",
        "postCode": "29044"
      },
      {
        "name": "Ferraguig",
        "postCode": "29046"
      },
      {
        "name": "Froha",
        "postCode": "29024"
      },
      {
        "name": "Gharrous",
        "postCode": "29047"
      },
      {
        "name": "Ghriss",
        "postCode": "29006"
      },
      {
        "name": "Guerdjoum",
        "postCode": "29050"
      },
      {
        "name": "Hacine",
        "postCode": "29014"
      },
      {
        "name": "Khalouia",
        "postCode": "29025"
      },
      {
        "name": "Makhda",
        "postCode": "29055"
      },
      {
        "name": "Maoussa",
        "postCode": "29015"
      },
      {
        "name": "Mascara",
        "postCode": "29000"
      },
      {
        "name": "Matemore",
        "postCode": "29026"
      },
      {
        "name": "Mocta-Douz",
        "postCode": "29027"
      },
      {
        "name": "Mohammadia",
        "postCode": "29003"
      },
      {
        "name": "Nesmot",
        "postCode": "29058"
      },
      {
        "name": "Oggaz",
        "postCode": "29029"
      },
      {
        "name": "Oued El Abtal",
        "postCode": "29016"
      },
      {
        "name": "Oued Taria",
        "postCode": "29017"
      },
      {
        "name": "Ras El Ain Amirouche",
        "postCode": "29060"
      },
      {
        "name": "Sedjerara",
        "postCode": "29062"
      },
      {
        "name": "Sehailia",
        "postCode": "29063"
      },
      {
        "name": "Sidi Abdeldjebar",
        "postCode": "29065"
      },
      {
        "name": "Sidi Abdelmoumene",
        "postCode": "29054"
      },
      {
        "name": "Sidi Boussaid",
        "postCode": "29069"
      },
      {
        "name": "Sidi Kada",
        "postCode": "29030"
      },
      {
        "name": "Sig",
        "postCode": "29001"
      },
      {
        "name": "Tighennif",
        "postCode": "29004"
      },
      {
        "name": "Tizi",
        "postCode": "29000"
      },
      {
        "name": "Zahana",
        "postCode": "29019"
      },
      {
        "name": "Zelamta",
        "postCode": "29057"
      }
    ]
  },
  {
    "id": "30",
    "name": "Ouargla",
    "communes": [
      {
        "name": "Ain Beida",
        "postCode": "30000"
      },
      {
        "name": "El Borma",
        "postCode": "30025"
      },
      {
        "name": "Hassi Ben Abdellah",
        "postCode": "30052"
      },
      {
        "name": "Hassi Messaoud",
        "postCode": "30001"
      },
      {
        "name": "N'goussa",
        "postCode": "30026"
      },
      {
        "name": "Ouargla",
        "postCode": "30000"
      },
      {
        "name": "Rouissat",
        "postCode": "30013"
      },
      {
        "name": "Sidi Khouiled",
        "postCode": "30035"
      }
    ]
  },
  {
    "id": "31",
    "name": "Oran",
    "communes": [
      {
        "name": "Ain Biya",
        "postCode": "31040"
      },
      {
        "name": "Ain Kerma",
        "postCode": "31059"
      },
      {
        "name": "Ain Turk",
        "postCode": "31014"
      },
      {
        "name": "Arzew",
        "postCode": "31004"
      },
      {
        "name": "Ben Freha",
        "postCode": "31027"
      },
      {
        "name": "Bethioua",
        "postCode": "31015"
      },
      {
        "name": "Bir El Djir",
        "postCode": "31001"
      },
      {
        "name": "Boufatis",
        "postCode": "31024"
      },
      {
        "name": "Bousfer",
        "postCode": "31025"
      },
      {
        "name": "Boutlelis",
        "postCode": "31016"
      },
      {
        "name": "El Ancor",
        "postCode": "31043"
      },
      {
        "name": "El Braya",
        "postCode": "31070"
      },
      {
        "name": "El Kerma",
        "postCode": "31026"
      },
      {
        "name": "Es Senia",
        "postCode": "31005"
      },
      {
        "name": "Gdyel",
        "postCode": "31017"
      },
      {
        "name": "Hassi Ben Okba",
        "postCode": "31049"
      },
      {
        "name": "Hassi Bounif",
        "postCode": "31028"
      },
      {
        "name": "Hassi Mefsoukh",
        "postCode": "31046"
      },
      {
        "name": "Marsat El Hadjadj",
        "postCode": "31030"
      },
      {
        "name": "Mers El Kebir",
        "postCode": "31019"
      },
      {
        "name": "Messerghin",
        "postCode": "31031"
      },
      {
        "name": "Oran",
        "postCode": "31000"
      },
      {
        "name": "Oued Tlelat",
        "postCode": "31037"
      },
      {
        "name": "Sidi Ben Yebka",
        "postCode": "31058"
      },
      {
        "name": "Sidi Chami",
        "postCode": "31038"
      },
      {
        "name": "Tafraoui",
        "postCode": "31077"
      }
    ]
  },
  {
    "id": "32",
    "name": "El Bayadh",
    "communes": [
      {
        "name": "Ain El Orak",
        "postCode": "32019"
      },
      {
        "name": "Arbaouat",
        "postCode": "32005"
      },
      {
        "name": "Boualem",
        "postCode": "32006"
      },
      {
        "name": "Bougtoub",
        "postCode": "32001"
      },
      {
        "name": "Boussemghoun",
        "postCode": "32014"
      },
      {
        "name": "Brezina",
        "postCode": "32002"
      },
      {
        "name": "Cheguig",
        "postCode": "32022"
      },
      {
        "name": "Chellala",
        "postCode": "32015"
      },
      {
        "name": "El Bayadh",
        "postCode": "32000"
      },
      {
        "name": "El Bnoud",
        "postCode": "32025"
      },
      {
        "name": "El Kheiter",
        "postCode": "32011"
      },
      {
        "name": "El Mehara",
        "postCode": "32024"
      },
      {
        "name": "Ghassoul",
        "postCode": "32017"
      },
      {
        "name": "Kef El Ahmar",
        "postCode": "32013"
      },
      {
        "name": "Krakda",
        "postCode": "32027"
      },
      {
        "name": "Labiodh Sidi Cheikh",
        "postCode": "32003"
      },
      {
        "name": "Rogassa",
        "postCode": "32018"
      },
      {
        "name": "Sidi Ameur",
        "postCode": "32000"
      },
      {
        "name": "Sidi Slimane",
        "postCode": "32000"
      },
      {
        "name": "Sidi Tiffour",
        "postCode": "32032"
      },
      {
        "name": "Stitten",
        "postCode": "32033"
      },
      {
        "name": "Tousmouline",
        "postCode": "32034"
      }
    ]
  },
  {
    "id": "33",
    "name": "Illizi",
    "communes": [
      {
        "name": "Bordj Omar Driss",
        "postCode": "33003"
      },
      {
        "name": "Debdeb",
        "postCode": "33004"
      },
      {
        "name": "Illizi",
        "postCode": "33000"
      },
      {
        "name": "In Amenas",
        "postCode": "33001"
      }
    ]
  },
  {
    "id": "34",
    "name": "Bordj Bou Arreridj",
    "communes": [
      {
        "name": "Ain Taghrout",
        "postCode": "34010"
      },
      {
        "name": "Ain Tesra",
        "postCode": "34027"
      },
      {
        "name": "B. B. Arreridj",
        "postCode": "34000"
      },
      {
        "name": "Belimour",
        "postCode": "34025"
      },
      {
        "name": "Ben Daoud",
        "postCode": "34073"
      },
      {
        "name": "Bir Kasdali",
        "postCode": "34011"
      },
      {
        "name": "Bordj Ghedir",
        "postCode": "34004"
      },
      {
        "name": "Bordj Zemmoura",
        "postCode": "34005"
      },
      {
        "name": "Colla",
        "postCode": "34015"
      },
      {
        "name": "Djaafra",
        "postCode": "34016"
      },
      {
        "name": "El Achir",
        "postCode": "34006"
      },
      {
        "name": "El Annasseur",
        "postCode": "34030"
      },
      {
        "name": "El Euch",
        "postCode": "34029"
      },
      {
        "name": "El M'hir",
        "postCode": "34019"
      },
      {
        "name": "El Main",
        "postCode": "34018"
      },
      {
        "name": "Elhammadia",
        "postCode": "34000"
      },
      {
        "name": "Ghailasa",
        "postCode": "34031"
      },
      {
        "name": "Haraza",
        "postCode": "34047"
      },
      {
        "name": "Hasnaoua",
        "postCode": "34068"
      },
      {
        "name": "Khelil",
        "postCode": "34028"
      },
      {
        "name": "Ksour",
        "postCode": "34048"
      },
      {
        "name": "Mansoura",
        "postCode": "34008"
      },
      {
        "name": "Medjana",
        "postCode": "34009"
      },
      {
        "name": "Ouled Brahem",
        "postCode": "34032"
      },
      {
        "name": "Ouled Dahmane",
        "postCode": "34033"
      },
      {
        "name": "Ouled Sidi-Brahim",
        "postCode": "34052"
      },
      {
        "name": "Rabta",
        "postCode": "34035"
      },
      {
        "name": "Ras El Oued",
        "postCode": "34001"
      },
      {
        "name": "Sidi-Embarek",
        "postCode": "34020"
      },
      {
        "name": "Taglait",
        "postCode": "34059"
      },
      {
        "name": "Tassamert",
        "postCode": "34026"
      },
      {
        "name": "Tefreg",
        "postCode": "34061"
      },
      {
        "name": "Teniet En Nasr",
        "postCode": "34021"
      },
      {
        "name": "Tixter",
        "postCode": "34022"
      }
    ]
  },
  {
    "id": "35",
    "name": "Boumerdès",
    "communes": [
      {
        "name": "Afir",
        "postCode": "35022"
      },
      {
        "name": "Ammal",
        "postCode": "35031"
      },
      {
        "name": "Baghlia",
        "postCode": "35013"
      },
      {
        "name": "Ben Choud",
        "postCode": "35033"
      },
      {
        "name": "Beni Amrane",
        "postCode": "35006"
      },
      {
        "name": "Bordj Menaiel",
        "postCode": "35001"
      },
      {
        "name": "Boudouaou",
        "postCode": "35003"
      },
      {
        "name": "Boudouaou El Bahri",
        "postCode": "35023"
      },
      {
        "name": "Boumerdes",
        "postCode": "35000"
      },
      {
        "name": "Bouzegza Keddara",
        "postCode": "35038"
      },
      {
        "name": "Chabet El Ameur",
        "postCode": "35008"
      },
      {
        "name": "Corso",
        "postCode": "35014"
      },
      {
        "name": "Dellys",
        "postCode": "35004"
      },
      {
        "name": "Djinet",
        "postCode": "35024"
      },
      {
        "name": "El Kharrouba",
        "postCode": "35000"
      },
      {
        "name": "Hammedi",
        "postCode": "35015"
      },
      {
        "name": "Isser",
        "postCode": "35009"
      },
      {
        "name": "Khemis El Khechna",
        "postCode": "35010"
      },
      {
        "name": "Larbatache",
        "postCode": "35017"
      },
      {
        "name": "Leghata",
        "postCode": "35026"
      },
      {
        "name": "Naciria",
        "postCode": "35018"
      },
      {
        "name": "Ouled Aissa",
        "postCode": "35000"
      },
      {
        "name": "Ouled Hedadj",
        "postCode": "35052"
      },
      {
        "name": "Ouled Moussa",
        "postCode": "35011"
      },
      {
        "name": "Si Mustapha",
        "postCode": "35028"
      },
      {
        "name": "Sidi Daoud",
        "postCode": "35019"
      },
      {
        "name": "Souk El Had",
        "postCode": "35000"
      },
      {
        "name": "Taourga",
        "postCode": "35029"
      },
      {
        "name": "Thenia",
        "postCode": "35005"
      },
      {
        "name": "Tidjelabine",
        "postCode": "35021"
      },
      {
        "name": "Timezrit",
        "postCode": "35027"
      },
      {
        "name": "Zemmouri",
        "postCode": "35012"
      }
    ]
  },
  {
    "id": "36",
    "name": "El Tarf",
    "communes": [
      {
        "name": "Ain El Assel",
        "postCode": "36010"
      },
      {
        "name": "Ain Kerma",
        "postCode": "36011"
      },
      {
        "name": "Asfour",
        "postCode": "36012"
      },
      {
        "name": "Ben M Hidi",
        "postCode": "36003"
      },
      {
        "name": "Berrihane",
        "postCode": "36027"
      },
      {
        "name": "Besbes",
        "postCode": "36017"
      },
      {
        "name": "Bougous",
        "postCode": "36029"
      },
      {
        "name": "Bouhadjar",
        "postCode": "36005"
      },
      {
        "name": "Bouteldja",
        "postCode": "36006"
      },
      {
        "name": "Chebaita Mokhtar",
        "postCode": "36013"
      },
      {
        "name": "Chefia",
        "postCode": "36032"
      },
      {
        "name": "Chihani",
        "postCode": "36014"
      },
      {
        "name": "Drean",
        "postCode": "36001"
      },
      {
        "name": "Echatt",
        "postCode": "36025"
      },
      {
        "name": "El Aioun",
        "postCode": "36018"
      },
      {
        "name": "El Kala",
        "postCode": "36002"
      },
      {
        "name": "El Tarf",
        "postCode": "36000"
      },
      {
        "name": "Hammam Beni Salah",
        "postCode": "36036"
      },
      {
        "name": "Lac Des Oiseaux",
        "postCode": "36019"
      },
      {
        "name": "Oued Zitoun",
        "postCode": "36044"
      },
      {
        "name": "Raml Souk",
        "postCode": "36021"
      },
      {
        "name": "Souarekh",
        "postCode": "36020"
      },
      {
        "name": "Zerizer",
        "postCode": "36015"
      },
      {
        "name": "Zitouna",
        "postCode": "36039"
      }
    ]
  },
  {
    "id": "37",
    "name": "Tindouf",
    "communes": [
      {
        "name": "Oum El Assel",
        "postCode": "37003"
      },
      {
        "name": "Tindouf",
        "postCode": "37000"
      }
    ]
  },
  {
    "id": "38",
    "name": "Tissemsilt",
    "communes": [
      {
        "name": "Ammari",
        "postCode": "38012"
      },
      {
        "name": "Beni Chaib",
        "postCode": "38019"
      },
      {
        "name": "Beni Lahcene",
        "postCode": "38020"
      },
      {
        "name": "Bordj Bounaama",
        "postCode": "38001"
      },
      {
        "name": "Bordj El Emir Abdelkader",
        "postCode": "38041"
      },
      {
        "name": "Boucaid",
        "postCode": "38005"
      },
      {
        "name": "Khemisti",
        "postCode": "38016"
      },
      {
        "name": "Larbaa",
        "postCode": "38000"
      },
      {
        "name": "Lardjem",
        "postCode": "38002"
      },
      {
        "name": "Layoune",
        "postCode": "38007"
      },
      {
        "name": "Lazharia",
        "postCode": "38008"
      },
      {
        "name": "Maacem",
        "postCode": "38023"
      },
      {
        "name": "Melaab",
        "postCode": "38013"
      },
      {
        "name": "Ouled Bessam",
        "postCode": "38014"
      },
      {
        "name": "Sidi Abed",
        "postCode": "38025"
      },
      {
        "name": "Sidi Boutouchent",
        "postCode": "38026"
      },
      {
        "name": "Sidi Lantri",
        "postCode": "38027"
      },
      {
        "name": "Sidi Slimane",
        "postCode": "38000"
      },
      {
        "name": "Tamellahet",
        "postCode": "38029"
      },
      {
        "name": "Theniet El Had",
        "postCode": "38003"
      },
      {
        "name": "Tissemsilt",
        "postCode": "38000"
      },
      {
        "name": "Youssoufia",
        "postCode": "38031"
      }
    ]
  },
  {
    "id": "39",
    "name": "El Oued",
    "communes": [
      {
        "name": "Bayadha",
        "postCode": "39007"
      },
      {
        "name": "Ben Guecha",
        "postCode": "39048"
      },
      {
        "name": "Debila",
        "postCode": "39003"
      },
      {
        "name": "Douar El Maa",
        "postCode": "39024"
      },
      {
        "name": "El Ogla",
        "postCode": "39055"
      },
      {
        "name": "El-Oued",
        "postCode": "39000"
      },
      {
        "name": "Guemar",
        "postCode": "39002"
      },
      {
        "name": "Hamraia",
        "postCode": "39061"
      },
      {
        "name": "Hassani Abdelkrim",
        "postCode": "39020"
      },
      {
        "name": "Hassi Khalifa",
        "postCode": "39013"
      },
      {
        "name": "Kouinine",
        "postCode": "39014"
      },
      {
        "name": "Magrane",
        "postCode": "39015"
      },
      {
        "name": "Mih Ouansa",
        "postCode": "39030"
      },
      {
        "name": "Nakhla",
        "postCode": "39031"
      },
      {
        "name": "Oued El Alenda",
        "postCode": "39033"
      },
      {
        "name": "Ourmes",
        "postCode": "39035"
      },
      {
        "name": "Reguiba",
        "postCode": "39016"
      },
      {
        "name": "Robbah",
        "postCode": "39017"
      },
      {
        "name": "Sidi Aoun",
        "postCode": "39037"
      },
      {
        "name": "Taghzout",
        "postCode": "39083"
      },
      {
        "name": "Taleb Larbi",
        "postCode": "39019"
      },
      {
        "name": "Trifaoui",
        "postCode": "39044"
      }
    ]
  },
  {
    "id": "40",
    "name": "Khenchela",
    "communes": [
      {
        "name": "Ain Touila",
        "postCode": "40028"
      },
      {
        "name": "Babar",
        "postCode": "40006"
      },
      {
        "name": "Baghai",
        "postCode": "40014"
      },
      {
        "name": "Bouhmama",
        "postCode": "40007"
      },
      {
        "name": "Chechar",
        "postCode": "40008"
      },
      {
        "name": "Chelia",
        "postCode": "40030"
      },
      {
        "name": "Djellal",
        "postCode": "40015"
      },
      {
        "name": "El Hamma",
        "postCode": "40031"
      },
      {
        "name": "El Mahmal",
        "postCode": "40012"
      },
      {
        "name": "El Oueldja",
        "postCode": "40000"
      },
      {
        "name": "Ensigha",
        "postCode": "40043"
      },
      {
        "name": "Kais",
        "postCode": "40001"
      },
      {
        "name": "Khenchela",
        "postCode": "40000"
      },
      {
        "name": "Khirane",
        "postCode": "40036"
      },
      {
        "name": "M'sara",
        "postCode": "40039"
      },
      {
        "name": "M'toussa",
        "postCode": "40021"
      },
      {
        "name": "Ouled Rechache",
        "postCode": "40013"
      },
      {
        "name": "Remila",
        "postCode": "40041"
      },
      {
        "name": "Tamza",
        "postCode": "40024"
      },
      {
        "name": "Taouzianat",
        "postCode": "40011"
      },
      {
        "name": "Yabous",
        "postCode": "40023"
      }
    ]
  },
  {
    "id": "41",
    "name": "Souk Ahras",
    "communes": [
      {
        "name": "Ain Soltane",
        "postCode": "41000"
      },
      {
        "name": "Ain Zana",
        "postCode": "41027"
      },
      {
        "name": "Bir Bouhouche",
        "postCode": "41011"
      },
      {
        "name": "Drea",
        "postCode": "41015"
      },
      {
        "name": "Haddada",
        "postCode": "41012"
      },
      {
        "name": "Hanencha",
        "postCode": "41016"
      },
      {
        "name": "Khedara",
        "postCode": "41013"
      },
      {
        "name": "Khemissa",
        "postCode": "41031"
      },
      {
        "name": "M'daourouche",
        "postCode": "41001"
      },
      {
        "name": "Machroha",
        "postCode": "41010"
      },
      {
        "name": "Merahna",
        "postCode": "41004"
      },
      {
        "name": "Oued Kebrit",
        "postCode": "41018"
      },
      {
        "name": "Ouillen",
        "postCode": "41029"
      },
      {
        "name": "Ouled Driss",
        "postCode": "41005"
      },
      {
        "name": "Ouled Moumen",
        "postCode": "41034"
      },
      {
        "name": "Oum El Adhaim",
        "postCode": "41019"
      },
      {
        "name": "Ragouba",
        "postCode": "41033"
      },
      {
        "name": "Safel El Ouiden",
        "postCode": "41035"
      },
      {
        "name": "Sedrata",
        "postCode": "41006"
      },
      {
        "name": "Sidi Fredj",
        "postCode": "41000"
      },
      {
        "name": "Souk Ahras",
        "postCode": "41000"
      },
      {
        "name": "Taoura",
        "postCode": "41009"
      },
      {
        "name": "Terraguelt",
        "postCode": "41037"
      },
      {
        "name": "Tiffech",
        "postCode": "41038"
      },
      {
        "name": "Zaarouria",
        "postCode": "41025"
      },
      {
        "name": "Zouabi",
        "postCode": "41039"
      }
    ]
  },
  {
    "id": "42",
    "name": "Tipaza",
    "communes": [
      {
        "name": "Aghbal",
        "postCode": "42035"
      },
      {
        "name": "Ahmer El Ain",
        "postCode": "42005"
      },
      {
        "name": "Ain Tagourait",
        "postCode": "42023"
      },
      {
        "name": "Attatba",
        "postCode": "42008"
      },
      {
        "name": "Beni Mileuk",
        "postCode": "42024"
      },
      {
        "name": "Bou Haroun",
        "postCode": "42009"
      },
      {
        "name": "Bou Ismail",
        "postCode": "42004"
      },
      {
        "name": "Bourkika",
        "postCode": "42011"
      },
      {
        "name": "Chaiba",
        "postCode": "42047"
      },
      {
        "name": "Cherchell",
        "postCode": "42002"
      },
      {
        "name": "Damous",
        "postCode": "42014"
      },
      {
        "name": "Douaouda",
        "postCode": "42015"
      },
      {
        "name": "Fouka",
        "postCode": "42006"
      },
      {
        "name": "Gouraya",
        "postCode": "42007"
      },
      {
        "name": "Hadjout",
        "postCode": "42001"
      },
      {
        "name": "Hadjret Ennous",
        "postCode": "42029"
      },
      {
        "name": "Khemisti",
        "postCode": "42016"
      },
      {
        "name": "Kolea",
        "postCode": "42003"
      },
      {
        "name": "Larhat",
        "postCode": "42017"
      },
      {
        "name": "Menaceur",
        "postCode": "42018"
      },
      {
        "name": "Merad",
        "postCode": "42019"
      },
      {
        "name": "Messelmoun",
        "postCode": "42036"
      },
      {
        "name": "Nador",
        "postCode": "42039"
      },
      {
        "name": "Sidi Ghiles",
        "postCode": "42021"
      },
      {
        "name": "Sidi Rached",
        "postCode": "42040"
      },
      {
        "name": "Sidi Semiane",
        "postCode": "42041"
      },
      {
        "name": "Sidi-Amar",
        "postCode": "42000"
      },
      {
        "name": "Tipaza",
        "postCode": "42000"
      }
    ]
  },
  {
    "id": "43",
    "name": "Mila",
    "communes": [
      {
        "name": "Ahmed Rachedi",
        "postCode": "43013"
      },
      {
        "name": "Ain Beida Harriche",
        "postCode": "43014"
      },
      {
        "name": "Ain Mellouk",
        "postCode": "43015"
      },
      {
        "name": "Ain Tine",
        "postCode": "43016"
      },
      {
        "name": "Amira Arres",
        "postCode": "43017"
      },
      {
        "name": "Benyahia Abderrahmane",
        "postCode": "43020"
      },
      {
        "name": "Bouhatem",
        "postCode": "43022"
      },
      {
        "name": "Chelghoum Laid",
        "postCode": "43001"
      },
      {
        "name": "Chigara",
        "postCode": "43025"
      },
      {
        "name": "Derrahi Bousselah",
        "postCode": "43046"
      },
      {
        "name": "El Ayadi Barbes",
        "postCode": "43050"
      },
      {
        "name": "El Mechira",
        "postCode": "43026"
      },
      {
        "name": "Ferdjioua",
        "postCode": "43002"
      },
      {
        "name": "Grarem Gouga",
        "postCode": "43004"
      },
      {
        "name": "Hamala",
        "postCode": "43052"
      },
      {
        "name": "Mila",
        "postCode": "43000"
      },
      {
        "name": "Minar Zarza",
        "postCode": "43036"
      },
      {
        "name": "Oued Athmenia",
        "postCode": "43005"
      },
      {
        "name": "Oued Endja",
        "postCode": "43006"
      },
      {
        "name": "Oued Seguen",
        "postCode": "43031"
      },
      {
        "name": "Ouled Khalouf",
        "postCode": "43032"
      },
      {
        "name": "Rouached",
        "postCode": "43009"
      },
      {
        "name": "Sidi Khelifa",
        "postCode": "43058"
      },
      {
        "name": "Sidi Merouane",
        "postCode": "43010"
      },
      {
        "name": "Tadjenanet",
        "postCode": "43007"
      },
      {
        "name": "Tassadane Haddada",
        "postCode": "43033"
      },
      {
        "name": "Tassala Lematai",
        "postCode": "43034"
      },
      {
        "name": "Teleghma",
        "postCode": "43008"
      },
      {
        "name": "Terrai Bainen",
        "postCode": "43018"
      },
      {
        "name": "Tiberguent",
        "postCode": "43035"
      },
      {
        "name": "Yahia Beniguecha",
        "postCode": "43071"
      },
      {
        "name": "Zeghaia",
        "postCode": "43012"
      }
    ]
  },
  {
    "id": "44",
    "name": "Aïn Defla",
    "communes": [
      {
        "name": "Ain-Benian",
        "postCode": "44035"
      },
      {
        "name": "Ain-Bouyahia",
        "postCode": "44032"
      },
      {
        "name": "Ain-Defla",
        "postCode": "44000"
      },
      {
        "name": "Ain-Lechiakh",
        "postCode": "44018"
      },
      {
        "name": "Ain-Soltane",
        "postCode": "44019"
      },
      {
        "name": "Ain-Torki",
        "postCode": "44020"
      },
      {
        "name": "Arib",
        "postCode": "44008"
      },
      {
        "name": "Bathia",
        "postCode": "44041"
      },
      {
        "name": "Belaas",
        "postCode": "44038"
      },
      {
        "name": "Ben Allal",
        "postCode": "44040"
      },
      {
        "name": "Bir-Ould-Khelifa",
        "postCode": "44043"
      },
      {
        "name": "Birbouche",
        "postCode": "44042"
      },
      {
        "name": "Bordj-Emir-Khaled",
        "postCode": "44021"
      },
      {
        "name": "Boumedfaa",
        "postCode": "44004"
      },
      {
        "name": "Bourached",
        "postCode": "44044"
      },
      {
        "name": "Djelida",
        "postCode": "44009"
      },
      {
        "name": "Djemaa Ouled Cheikh",
        "postCode": "44047"
      },
      {
        "name": "Djendel",
        "postCode": "44005"
      },
      {
        "name": "El-Abadia",
        "postCode": "44006"
      },
      {
        "name": "El-Amra",
        "postCode": "44010"
      },
      {
        "name": "El-Attaf",
        "postCode": "44002"
      },
      {
        "name": "El-Maine",
        "postCode": "44051"
      },
      {
        "name": "Hammam-Righa",
        "postCode": "44023"
      },
      {
        "name": "Hassania",
        "postCode": "44022"
      },
      {
        "name": "Hoceinia",
        "postCode": "44048"
      },
      {
        "name": "Khemis-Miliana",
        "postCode": "44001"
      },
      {
        "name": "Mekhatria",
        "postCode": "44050"
      },
      {
        "name": "Miliana",
        "postCode": "44003"
      },
      {
        "name": "Oued Chorfa",
        "postCode": "44024"
      },
      {
        "name": "Oued Djemaa",
        "postCode": "44049"
      },
      {
        "name": "Rouina",
        "postCode": "44017"
      },
      {
        "name": "Sidi-Lakhdar",
        "postCode": "44000"
      },
      {
        "name": "Tacheta Zegagha",
        "postCode": "44028"
      },
      {
        "name": "Tarik-Ibn-Ziad",
        "postCode": "44029"
      },
      {
        "name": "Tiberkanine",
        "postCode": "44030"
      },
      {
        "name": "Zeddine",
        "postCode": "44031"
      }
    ]
  },
  {
    "id": "45",
    "name": "Naâma",
    "communes": [
      {
        "name": "Ain Ben Khelil",
        "postCode": "45008"
      },
      {
        "name": "Ain Sefra",
        "postCode": "45001"
      },
      {
        "name": "Asla",
        "postCode": "45012"
      },
      {
        "name": "Djenienne Bourezg",
        "postCode": "45013"
      },
      {
        "name": "El Biodh",
        "postCode": "45004"
      },
      {
        "name": "Kasdir",
        "postCode": "45024"
      },
      {
        "name": "Makmen Ben Amar",
        "postCode": "45005"
      },
      {
        "name": "Mecheria",
        "postCode": "45002"
      },
      {
        "name": "Moghrar",
        "postCode": "45014"
      },
      {
        "name": "Naama",
        "postCode": "45000"
      },
      {
        "name": "Sfissifa",
        "postCode": "45021"
      },
      {
        "name": "Tiout",
        "postCode": "45030"
      }
    ]
  },
  {
    "id": "46",
    "name": "Aïn Témouchent",
    "communes": [
      {
        "name": "Aghlal",
        "postCode": "46016"
      },
      {
        "name": "Ain El Arbaa",
        "postCode": "46009"
      },
      {
        "name": "Ain Kihal",
        "postCode": "46008"
      },
      {
        "name": "Ain Temouchent",
        "postCode": "46000"
      },
      {
        "name": "Ain Tolba",
        "postCode": "46010"
      },
      {
        "name": "Aoubellil",
        "postCode": "46017"
      },
      {
        "name": "Beni Saf",
        "postCode": "46001"
      },
      {
        "name": "Bouzedjar",
        "postCode": "46033"
      },
      {
        "name": "Chaabat El Ham",
        "postCode": "46011"
      },
      {
        "name": "Chentouf",
        "postCode": "46000"
      },
      {
        "name": "El Amria",
        "postCode": "46006"
      },
      {
        "name": "El Maleh",
        "postCode": "46067"
      },
      {
        "name": "El Messaid",
        "postCode": "46035"
      },
      {
        "name": "Emir Abdelkader",
        "postCode": "46000"
      },
      {
        "name": "Hammam Bou Hadjar",
        "postCode": "46005"
      },
      {
        "name": "Hassasna",
        "postCode": "46000"
      },
      {
        "name": "Hassi El Ghella",
        "postCode": "46012"
      },
      {
        "name": "Oued Berkeche",
        "postCode": "46022"
      },
      {
        "name": "Oued Sebbah",
        "postCode": "46023"
      },
      {
        "name": "Ouled Boudjemaa",
        "postCode": "46043"
      },
      {
        "name": "Ouled Kihal",
        "postCode": "46038"
      },
      {
        "name": "Oulhaca El Gheraba",
        "postCode": "46053"
      },
      {
        "name": "Sidi Ben Adda",
        "postCode": "46013"
      },
      {
        "name": "Sidi Boumediene",
        "postCode": "46051"
      },
      {
        "name": "Sidi Ouriache",
        "postCode": "46024"
      },
      {
        "name": "Sidi Safi",
        "postCode": "46025"
      },
      {
        "name": "Tamzoura",
        "postCode": "46026"
      },
      {
        "name": "Terga",
        "postCode": "46015"
      }
    ]
  },
  {
    "id": "47",
    "name": "Ghardaïa",
    "communes": [
      {
        "name": "Berriane",
        "postCode": "47003"
      },
      {
        "name": "Bounoura",
        "postCode": "47005"
      },
      {
        "name": "Dhayet Bendhahoua",
        "postCode": "47011"
      },
      {
        "name": "El Atteuf",
        "postCode": "47012"
      },
      {
        "name": "El Guerrara",
        "postCode": "47004"
      },
      {
        "name": "Ghardaia",
        "postCode": "47000"
      },
      {
        "name": "Mansoura",
        "postCode": "47023"
      },
      {
        "name": "Metlili",
        "postCode": "47002"
      },
      {
        "name": "Sebseb",
        "postCode": "47025"
      },
      {
        "name": "Zelfana",
        "postCode": "47007"
      }
    ]
  },
  {
    "id": "48",
    "name": "Relizane",
    "communes": [
      {
        "name": "Ain Rahma",
        "postCode": "48033"
      },
      {
        "name": "Ain-Tarek",
        "postCode": "48015"
      },
      {
        "name": "Ammi Moussa",
        "postCode": "48004"
      },
      {
        "name": "Belaassel Bouzagza",
        "postCode": "48036"
      },
      {
        "name": "Bendaoud",
        "postCode": "48053"
      },
      {
        "name": "Beni Dergoun",
        "postCode": "48039"
      },
      {
        "name": "Beni Zentis",
        "postCode": "48041"
      },
      {
        "name": "Dar Ben Abdelah",
        "postCode": "48044"
      },
      {
        "name": "Djidiouia",
        "postCode": "48005"
      },
      {
        "name": "El H'madna",
        "postCode": "48017"
      },
      {
        "name": "El Hassi",
        "postCode": "48059"
      },
      {
        "name": "El Ouldja",
        "postCode": "48000"
      },
      {
        "name": "El-Guettar",
        "postCode": "48016"
      },
      {
        "name": "El-Matmar",
        "postCode": "48009"
      },
      {
        "name": "Had Echkalla",
        "postCode": "48050"
      },
      {
        "name": "Hamri",
        "postCode": "48051"
      },
      {
        "name": "Kalaa",
        "postCode": "48018"
      },
      {
        "name": "Lahlef",
        "postCode": "48020"
      },
      {
        "name": "Mazouna",
        "postCode": "48002"
      },
      {
        "name": "Mediouna",
        "postCode": "48011"
      },
      {
        "name": "Mendes",
        "postCode": "48012"
      },
      {
        "name": "Merdja Sidi Abed",
        "postCode": "48056"
      },
      {
        "name": "Ouarizane",
        "postCode": "48013"
      },
      {
        "name": "Oued El Djemaa",
        "postCode": "48021"
      },
      {
        "name": "Oued Essalem",
        "postCode": "48022"
      },
      {
        "name": "Oued-Rhiou",
        "postCode": "48001"
      },
      {
        "name": "Ouled Aiche",
        "postCode": "48019"
      },
      {
        "name": "Ouled Sidi Mihoub",
        "postCode": "48061"
      },
      {
        "name": "Ramka",
        "postCode": "48024"
      },
      {
        "name": "Relizane",
        "postCode": "48000"
      },
      {
        "name": "Sidi Khettab",
        "postCode": "48029"
      },
      {
        "name": "Sidi Lazreg",
        "postCode": "48065"
      },
      {
        "name": "Sidi M'hamed Benali",
        "postCode": "48003"
      },
      {
        "name": "Sidi M'hamed Benaouda",
        "postCode": "48030"
      },
      {
        "name": "Sidi Saada",
        "postCode": "48067"
      },
      {
        "name": "Souk El Had",
        "postCode": "48000"
      },
      {
        "name": "Yellel",
        "postCode": "48006"
      },
      {
        "name": "Zemmoura",
        "postCode": "48008"
      }
    ]
  },
  {
    "id": "49",
    "name": "Timimoun",
    "communes": [
      {
        "name": "Aougrout",
        "postCode": "01012"
      },
      {
        "name": "Charouine",
        "postCode": "01014"
      },
      {
        "name": "Deldoul",
        "postCode": "01036"
      },
      {
        "name": "Ksar Kaddour",
        "postCode": "01035"
      },
      {
        "name": "Metarfa",
        "postCode": "01033"
      },
      {
        "name": "Ouled Aissa",
        "postCode": "01051"
      },
      {
        "name": "Ouled Said",
        "postCode": "01039"
      },
      {
        "name": "Talmine",
        "postCode": "01034"
      },
      {
        "name": "Timimoun",
        "postCode": "01001"
      },
      {
        "name": "Tinerkouk",
        "postCode": "01013"
      }
    ]
  },
  {
    "id": "50",
    "name": "Bordj Badji Mokhtar",
    "communes": [
      {
        "name": "Bordj Badji Mokhtar",
        "postCode": "01010"
      },
      {
        "name": "Timiaouine",
        "postCode": "01042"
      }
    ]
  },
  {
    "id": "51",
    "name": "Ouled Djellal",
    "communes": [
      {
        "name": "Besbes",
        "postCode": "07044"
      },
      {
        "name": "Chaiba",
        "postCode": "07045"
      },
      {
        "name": "Doucen",
        "postCode": "07007"
      },
      {
        "name": "Ouled Djellal",
        "postCode": "07002"
      },
      {
        "name": "Ras El Miad",
        "postCode": "07062"
      },
      {
        "name": "Sidi Khaled",
        "postCode": "07004"
      }
    ]
  },
  {
    "id": "52",
    "name": "Béni Abbès",
    "communes": [
      {
        "name": "Beni-Abbes",
        "postCode": "08002"
      },
      {
        "name": "Beni-Ikhlef",
        "postCode": "08025"
      },
      {
        "name": "El Ouata",
        "postCode": "08020"
      },
      {
        "name": "Igli",
        "postCode": "08021"
      },
      {
        "name": "Kerzaz",
        "postCode": "08022"
      },
      {
        "name": "Ksabi",
        "postCode": "08039"
      },
      {
        "name": "Ouled-Khodeir",
        "postCode": "08028"
      },
      {
        "name": "Tamtert",
        "postCode": "08046"
      },
      {
        "name": "Timoudi",
        "postCode": "08031"
      }
    ]
  },
  {
    "id": "53",
    "name": "In Salah",
    "communes": [
      {
        "name": "Ain Salah",
        "postCode": "11001"
      },
      {
        "name": "Foggaret Ezzoua",
        "postCode": "11016"
      },
      {
        "name": "Inghar",
        "postCode": "11004"
      }
    ]
  },
  {
    "id": "54",
    "name": "In Guezzam",
    "communes": [
      {
        "name": "Ain Guezzam",
        "postCode": "11005"
      },
      {
        "name": "Tin Zouatine",
        "postCode": "11011"
      }
    ]
  },
  {
    "id": "55",
    "name": "Touggourt",
    "communes": [
      {
        "name": "Benaceur",
        "postCode": "30020"
      },
      {
        "name": "Blidet Amor",
        "postCode": "30005"
      },
      {
        "name": "El Alia",
        "postCode": "30023"
      },
      {
        "name": "El-Hadjira",
        "postCode": "30006"
      },
      {
        "name": "M'naguer",
        "postCode": "30029"
      },
      {
        "name": "Megarine",
        "postCode": "30009"
      },
      {
        "name": "Nezla",
        "postCode": "30004"
      },
      {
        "name": "Sidi Slimane",
        "postCode": "30030"
      },
      {
        "name": "Taibet",
        "postCode": "30015"
      },
      {
        "name": "Tebesbest",
        "postCode": "30058"
      },
      {
        "name": "Temacine",
        "postCode": "30003"
      },
      {
        "name": "Touggourt",
        "postCode": "30002"
      },
      {
        "name": "Zaouia El Abidia",
        "postCode": "30018"
      }
    ]
  },
  {
    "id": "56",
    "name": "Djanet",
    "communes": [
      {
        "name": "Bordj El Haouass",
        "postCode": "33008"
      },
      {
        "name": "Djanet",
        "postCode": "33002"
      }
    ]
  },
  {
    "id": "57",
    "name": "El Meghaier",
    "communes": [
      {
        "name": "Djamaa",
        "postCode": "39004"
      },
      {
        "name": "El-M'ghaier",
        "postCode": "39005"
      },
      {
        "name": "M'rara",
        "postCode": "39067"
      },
      {
        "name": "Oum Touyour",
        "postCode": "39034"
      },
      {
        "name": "Sidi Amrane",
        "postCode": "39021"
      },
      {
        "name": "Sidi Khelil",
        "postCode": "39038"
      },
      {
        "name": "Still",
        "postCode": "39039"
      },
      {
        "name": "Tenedla",
        "postCode": "39042"
      }
    ]
  },
  {
    "id": "58",
    "name": "El Menia",
    "communes": [
      {
        "name": "El Meniaa",
        "postCode": "47001"
      },
      {
        "name": "Hassi Fehal",
        "postCode": "47021"
      },
      {
        "name": "Hassi Gara",
        "postCode": "47006"
      }
    ]
  }
];
