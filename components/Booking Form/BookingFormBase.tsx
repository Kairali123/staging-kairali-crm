"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./BookingForm.css";
import { calculateNights, useBookingPricing } from "./useBookingPricing";
import type {
  GuestData, GroupGuestData, ChildData, GroupInfo,
  TravelAgentInfo, AdvancePayment, ApprovalInfo,
  BookingDetails, ServiceCharge, PaymentBreakdown,
} from "./types";

// ─── API Constants ──────────────────────────────────────────────────────────
const DATA_API = "/api/ktahv-bookings/formdataktahv"
// const DATA_API = "https://script.google.com/macros/s/AKfycbzbvstR-50jR6VUq5Zo8E0tiJVKhPC-8FpAlTTbW26a8WlYYd0VnBNUqz03v102GzGq/exec";
const SUBMIT_API = "https://script.google.com/macros/s/AKfycbzexHfvw5UO2cVHLiK2Y52hfSzis_ip08QnwD01Aac_FGcG54hK5f6YDM9Qpt8E0xr9/exec";
//const SUBMIT_API = "https://script.google.com/macros/s/AKfycbwsH0Jf7HgkeYK5c1hSGjIQ2_G02csf-O0owtl5PxzFEN6CrPDXwyO1BSFb8auPY6F_Bw/exec";

const ROOM_MAX_PAX: Record<string, number> = {
  "DELUXE VILLA": 2, "CLASSIC VILLA": 2, "ROYAL VILLA": 3, "MAHARAJA SUITE": 5,
};

// ─── Default State Helpers ──────────────────────────────────────────────────
function emptyGuest(num: number): GuestData {
  return {
    guestNumber: num, title: "", firstName: "", middleName: "", lastName: "",
    dob: "", gender: "", countryCode: "", contact: "", email: "",
    anniversary: "", nationality: "", country: "", state: "", zip: "", address: "",
    bookingDetails: {
      arrivalDate: "", departureDate: "", nights: 0, repeatGuest: "",
      packageType: "rack", programme: "", roomType: "", roomNumber: "", occupancy: "Single",
    },
  };
}
function emptyGroupGuest(num: number): GroupGuestData {
  return {
    guestNumber: num, title: "", firstName: "", middleName: "", lastName: "",
    dob: "", gender: "", countryCode: "", contact: "", email: "",
    anniversary: "", nationality: "", country: "", state: "", zip: "", address: "",
    arrivalDate: "", departureDate: "", nights: 0, repeatGuest: "", packageType: "rack",
    programme: "", roomType: "", roomNumber: "", occupancy: "Single",
  };
}
function emptyTravelAgent(): TravelAgentInfo {
  return { hasAgent: false, name: "", countryCode: "", mobile: "", email: "", category: "", commission: "", remarks: "" };
}
function emptyAdvancePayment(): AdvancePayment {
  return {
    isAdvancePayment: false, isComplementary: false, isVoucher: false,
    paymentMode: "", transactionNo: "", screenshotName: "", screenshotBase64: "",
    screenshotType: "", amount: "", totalReceived: "", totalAmount: "", percentage: "", pending: "", remarks: "",
    paymentReceivedDate: "", paymentLocation: "", paymentCollectionBy: "Admin",
  };
}
function emptyApproval(): ApprovalInfo {
  return {
    isApprovalRequired: false, approvedBy: "", screenshotName: "",
    screenshotBase64: "", screenshotType: "", remarks: "",
    approvalGivenDate: "", approvalValidTillDate: "",
  };
}

// ─── Individual Form Steps ──────────────────────────────────────────────────
const IND_STEPS = [
  { icon: "fa-user", label: "Primary Guest" },
  { icon: "fa-users", label: "Secondary Guest" },
  { icon: "fa-child", label: "Child Information" },
  { icon: "fa-info-circle", label: "Additional Info" },
  { icon: "fa-briefcase", label: "Travel Agents" },
  { icon: "fa-calculator", label: "Payment Breakdown" },
  { icon: "fa-credit-card", label: "Advance Payment" },
  { icon: "fa-file-upload", label: "Approval Upload" },
  { icon: "fa-check-circle", label: "Review & Submit" },
];
const GRP_STEPS = [
  { icon: "fa-users", label: "Group Info" },
  { icon: "fa-users", label: "Guest Info" },
  { icon: "fa-info-circle", label: "Additional Info" },
  { icon: "fa-briefcase", label: "Travel Agents" },
  { icon: "fa-calculator", label: "Payment Breakdown" },
  { icon: "fa-credit-card", label: "Advance Payment" },
  { icon: "fa-file-upload", label: "Approval Upload" },
  { icon: "fa-check-circle", label: "Review & Confirm" },
];

// ─── Reusable Field Components ──────────────────────────────────────────────
interface FieldProps { label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string; }
function Field({ label, required, error, children, className = "" }: FieldProps) {
  return (
    <div className={`kbf-group ${className}`}>
      <label className={`kbf-label${required ? " required" : ""}`}>{label}</label>
      {children}
      {error && <span className="kbf-error-text">{error}</span>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { error?: boolean; }
function KInput({ error, className = "", ...props }: InputProps) {
  return <input className={`kbf-input${error ? " error" : ""} ${className}`} {...props} />;
}
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { error?: boolean; children: React.ReactNode; }
function KSelect({ error, className = "", children, ...props }: SelectProps) {
  return <select className={`kbf-select${error ? " error" : ""} ${className}`} {...props}>{children}</select>;
}
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { error?: boolean; }
function KTextarea({ error, className = "", ...props }: TextareaProps) {
  return <textarea className={`kbf-textarea${error ? " error" : ""} ${className}`} {...props} />;
}

// ─── Section Card Header ────────────────────────────────────────────────────
function CardHeader({ stepNo, icon, title }: { stepNo: number; icon: string; title: string }) {
  return (
    <div className="kbf-card-header">
      <div className="kbf-card-step-no">{stepNo}</div>
      <i className={`fas ${icon}`} />
      <h2>{title}</h2>
    </div>
  );
}

// ─── Country & State Data (imported inline from index.html) ─────────────────
export const DEFAULT_COUNTRY_STATE_MAP: Record<string, string[]> = { "Afghanistan": ["Badakhshan", "Badghis", "Baghlan", "Balkh", "Bamyan", "Daykundi", "Farah", "Faryab", "Ghazni", "Ghōr", "Helmand", "Herat", "Jowzjan", "Kabul", "Kandahar", "Kapisa", "Khost", "Kunar", "Kunduz Province", "Laghman", "Logar", "Nangarhar", "Nimruz", "Nuristan", "Paktia", "Paktika", "Panjshir", "Parwan", "Samangan", "Sar-e Pol", "Takhar", "Urozgan", "Zabul"], "Albania": ["Berat District", "Dibër County", "Durrës District", "Fier County", "Gjirokastër District", "Korçë County", "Kukës District", "Lezhë County", "Shkodër District", "Tirana District", "Vlorë County"], "Algeria": ["Adrar", "Aïn Defla", "Aïn Témouchent", "Algiers", "Annaba", "Batna", "Béchar", "Béjaïa", "Biskra", "Blida", "Bordj Bou Arréridj", "Bouïra", "Boumerdès", "Chlef", "Constantine", "Djelfa", "El Bayadh", "El Oued", "El Tarf", "Ghardaïa", "Guelma", "Illizi", "Jijel", "Khenchela", "Laghouat", "M'Sila", "Mascara", "Médéa", "Mila", "Mostaganem", "Naama", "Oran", "Ouargla", "Oum El Bouaghi", "Relizane", "Saïda", "Sétif", "Sidi Bel Abbès", "Skikda", "Souk Ahras", "Tamanghasset", "Tébessa", "Tiaret", "Tindouf", "Tipasa", "Tissemsilt", "Tizi Ouzou", "Tlemcen"], "Andorra": ["Andorra la Vella", "Canillo", "Encamp", "Escaldes-Engordany", "La Massana", "Ordino", "Sant Julià de Lòria"], "Angola": ["Bengo Province", "Benguela Province", "Bié Province", "Cabinda Province", "Cuando Cubango Province", "Cuanza Norte Province", "Cuanza Sul", "Cunene Province", "Huambo Province", "Huíla Province", "Luanda Province", "Lunda Norte Province", "Lunda Sul Province", "Malanje Province", "Moxico Province", "Uíge Province", "Zaire Province"], "Antigua and Barbuda": ["Barbuda", "Saint George Parish", "Saint John Parish", "Saint Mary Parish", "Saint Paul Parish", "Saint Peter Parish"], "Argentina": ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"], "Armenia": ["Aragatsotn Region", "Ararat Province", "Armavir Region", "Gegharkunik Province", "Kotayk Region", "Lori Region", "Shirak Region", "Syunik Province", "Tavush Region", "Vayots Dzor Region", "Yerevan"], "Australia": ["Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia"], "Austria": ["Burgenland", "Carinthia", "Lower Austria", "Salzburg", "Styria", "Tyrol", "Upper Austria", "Vienna", "Vorarlberg"], "Azerbaijan": ["Absheron District", "Agdam District", "Agdash District", "Aghjabadi District", "Agstafa District", "Agsu District", "Astara District", "Baku", "Balakan District", "Barda District", "Beylagan District", "Bilasuvar District", "Dashkasan District", "Fizuli District", "Ganja", "Gədəbəy", "Gobustan District", "Goranboy District", "Goychay", "Goygol District", "Hajigabul District", "Imishli District", "Ismailli District", "Jabrayil District", "Jalilabad District", "Kalbajar District", "Khachmaz District", "Khizi District", "Khojali District", "Kurdamir District", "Lachin District", "Lankaran District", "Lerik District", "Martuni", "Masally District", "Mingachevir", "Nakhchivan Autonomous Republic", "Neftchala District", "Oghuz District", "Qabala District", "Qakh District", "Qazakh District", "Quba District", "Qubadli District", "Qusar District", "Saatly District", "Sabirabad District", "Salyan District", "Samukh District", "Shabran District", "Shaki", "Shaki District", "Shamakhi District", "Shamkir District", "Shirvan", "Shusha District", "Siazan District", "Sumqayit", "Tartar District", "Tovuz District", "Ujar District", "Yardymli District", "Yevlakh", "Yevlakh District", "Zangilan District", "Zaqatala District", "Zardab District"], "Bahrain": ["Capital", "Central", "Muharraq", "Southern"], "Bangladesh": ["Barisal", "Chittagong", "Dhaka", "Khulna", "Mymensingh", "Rajshahi", "Rangpur", "Sylhet"], "Barbados": ["Christ Church", "Saint Andrew", "Saint James", "Saint Joseph", "Saint Michael", "Saint Peter", "Saint Philip"], "Belarus": ["Brest Region", "Gomel Region", "Grodno Region", "Minsk", "Minsk Region", "Mogilev Region", "Vitebsk Region"], "Belgium": ["Brussels-Capital Region", "Flanders", "Wallonia"], "Belize": ["Belize District", "Cayo District", "Corozal District", "Orange Walk District", "Stann Creek District", "Toledo District"], "Benin": ["Alibori Department", "Atakora Department", "Atlantique Department", "Borgou Department", "Collines Department", "Donga Department", "Kouffo Department", "Littoral Department", "Mono Department", "Ouémé Department", "Plateau Department", "Zou Department"], "Bermuda": ["Devonshire", "Hamilton", "Paget", "Saint George's", "Sandys", "Smith's", "Southampton", "Warwick"], "Bhutan": ["Bumthang", "Chukha", "Dagana", "Gasa", "Haa", "Lhuntse", "Mongar", "Paro", "Pemagatshel", "Punakha", "Samdrup Jongkhar", "Samtse", "Sarpang", "Thimphu", "Trashi Yangtse\t", "Trashigang", "Trongsa", "Tsirang", "Wangdue Phodrang", "Zhemgang"], "Bolivia": ["Beni Department", "Chuquisaca Department", "Cochabamba Department", "La Paz Department", "Oruro Department", "Pando Department", "Potosí Department", "Santa Cruz Department", "Tarija Department"], "Netherlands Antilles": ["Bonaire"], "Bosnia and Herzegovina": ["Brčko District", "Federation of Bosnia and Herzegovina", "Republika Srpska"], "Botswana": ["Central District", "Ghanzi District", "Kgalagadi District", "Kgatleng District", "Kweneng District", "North-East District", "North-West District", "South-East District", "Southern District"], "Brazil": ["Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"], "Brunei": ["Belait District", "Brunei-Muara District", "Temburong District", "Tutong District"], "Bulgaria": ["Blagoevgrad Province", "Burgas Province", "Dobrich Province", "Gabrovo Province", "Haskovo Province", "Kardzhali Province", "Kyustendil Province", "Lovech Province", "Montana Province", "Pazardzhik Province", "Pernik Province", "Pleven Province", "Plovdiv Province", "Razgrad Province", "Ruse Province", "Shumen", "Silistra Province", "Sliven Province", "Smolyan Province", "Sofia City Province", "Sofia Province", "Stara Zagora Province", "Targovishte Province", "Varna Province", "Veliko Tarnovo Province", "Vidin Province", "Vratsa Province", "Yambol Province"], "Burkina Faso": ["Boucle du Mouhoun Region", "Cascades Region", "Centre", "Centre-Est Region", "Centre-Nord Region", "Centre-Ouest Region", "Centre-Sud Region", "Est Region", "Hauts-Bassins Region", "Nord Region, Burkina Faso", "Plateau-Central Region", "Sahel Region", "Sud-Ouest Region"], "Burundi": ["Bubanza Province", "Bujumbura Mairie Province", "Bururi Province", "Cankuzo Province", "Cibitoke Province", "Gitega Province", "Karuzi Province", "Kayanza Province", "Kirundo Province", "Makamba Province", "Muramvya Province", "Muyinga Province", "Mwaro Province", "Ngozi Province", "Rumonge Province", "Rutana Province", "Ruyigi Province"], "Cambodia": ["Banteay Meanchey", "Battambang", "Kampong Cham", "Kampong Chhnang", "Kampong Speu", "Kampot", "Kandal", "Kep", "Koh Kong", "Kratie", "Mondulkiri", "Oddar Meanchey", "Pailin", "Phnom Penh", "Preah Vihear", "Prey Veng", "Pursat", "Ratanakiri", "Siem Reap", "Sihanoukville", "Stung Treng", "Svay Rieng", "Takeo"], "Cameroon": ["Adamawa", "East", "Far North", "Littoral", "North", "Northwest", "South", "Southwest", "West"], "Canada": ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"], "Cape Verde": ["Boa Vista", "Brava", "Maio Municipality", "Mosteiros", "Paul", "Porto Novo", "Praia", "Ribeira Brava Municipality", "Ribeira Grande", "Ribeira Grande de Santiago", "Sal", "Santa Catarina do Fogo", "São Domingos", "São Filipe", "São Lourenço dos Órgãos", "São Miguel", "São Vicente", "Tarrafal", "Tarrafal de São Nicolau"], "Cayman Islands": ["Cayman Brac", "Grand Cayman", "Little Cayman"], "Central African Republic": ["Bamingui-Bangoran Prefecture", "Bangui", "Basse-Kotto Prefecture", "Haut-Mbomou Prefecture", "Haute-Kotto Prefecture", "Kémo Prefecture", "Lobaye Prefecture", "Mambéré-Kadéï", "Mbomou Prefecture", "Nana-Grébizi Economic Prefecture", "Nana-Mambéré Prefecture", "Ombella-M'Poko Prefecture", "Ouaka Prefecture", "Ouham Prefecture", "Ouham-Pendé Prefecture", "Sangha-Mbaéré", "Vakaga Prefecture"], "Chad": ["Bahr el Gazel", "Batha", "Borkou", "Chari-Baguirmi", "Ennedi-Ouest", "Guéra", "Hadjer-Lamis", "Kanem", "Lac", "Logone Occidental", "Logone Oriental", "Mandoul", "Mayo-Kebbi Est", "Mayo-Kebbi Ouest", "Moyen-Chari", "N'Djamena", "Ouaddaï", "Salamat", "Sila", "Tandjilé", "Tibesti", "Wadi Fira"], "Chile": ["Aisén del General Carlos Ibañez del Campo", "Antofagasta", "Arica y Parinacota", "Atacama", "Biobío", "Coquimbo", "La Araucanía", "Libertador General Bernardo O'Higgins", "Los Lagos", "Los Ríos", "Magallanes y de la Antártica Chilena", "Maule", "Ñuble", "Región Metropolitana de Santiago", "Tarapacá", "Valparaíso"], "China": ["Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong", "Guangxi Zhuang", "Guizhou", "Hainan", "Hebei", "Heilongjiang", "Henan", "Hubei", "Hunan", "Inner Mongolia", "Jiangsu", "Jiangxi", "Jilin", "Liaoning", "Ningxia Huizu", "Qinghai", "Shaanxi", "Shandong", "Shanghai", "Shanxi", "Sichuan", "Taiwan", "Tianjin", "Xinjiang", "Xizang", "Yunnan", "Zhejiang"], "Colombia": ["Antioquia", "Arauca", "Archipiélago de San Andrés, Providencia y Santa Catalina", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"], "Comoros": ["Anjouan", "Grande Comore", "Mohéli"], "Republic of the Congo": ["Bouenza Department", "Brazzaville", "Cuvette Department", "Cuvette-Ouest Department", "Lékoumou Department", "Likouala Department", "Niari Department", "Plateaux Department", "Pointe-Noire", "Pool Department", "Sangha Department"], "Costa Rica": ["Alajuela Province", "Guanacaste Province", "Heredia Province", "Limón Province", "Provincia de Cartago", "Puntarenas Province", "San José Province"], "Cote D'Ivoire (Ivory Coast)": ["Abidjan", "Bas-Sassandra District", "Comoé District", "Denguélé District", "Dix-Huit Montagnes", "Gôh-Djiboua District", "Lacs Region", "Lagunes region", "Sassandra-Marahoué District", "Vallée du Bandama Region", "Woroba District", "Zanzan Region"], "Croatia": ["Bjelovar-Bilogora", "Brod-Posavina", "Dubrovnik-Neretva", "Istria", "Koprivnica-Križevci", "Krapina-Zagorje", "Lika-Senj", "Međimurje", "Osijek-Baranja", "Požega-Slavonia", "Primorje-Gorski Kotar", "Šibenik-Knin", "Sisak-Moslavina", "Split-Dalmatia", "Varaždin", "Virovitica-Podravina", "Vukovar-Syrmia", "Zadar", "Zagreb"], "Cuba": ["Artemisa Province", "Camagüey Province", "Ciego de Ávila Province", "Cienfuegos Province", "Granma Province", "Guantánamo Province", "Havana Province", "Holguín Province", "Isla de la Juventud", "Las Tunas Province", "Matanzas Province", "Mayabeque Province", "Pinar del Río Province", "Sancti Spíritus Province", "Santiago de Cuba Province", "Villa Clara Province"], "Cyprus": ["Famagusta District (Mağusa)", "Kyrenia District (Keryneia)", "Larnaca District (Larnaka)", "Limassol District (Leymasun)", "Nicosia District (Lefkoşa)", "Paphos District (Pafos)"], "Czech Republic": ["Jihočeský kraj", "Jihomoravský kraj", "Karlovarský kraj", "Kraj Vysočina", "Královéhradecký kraj", "Liberecký kraj", "Moravskoslezský kraj", "Olomoucký kraj", "Pardubický kraj", "Plzeň-jih", "Praha, Hlavní město", "Středočeský kraj", "Ústecký kraj", "Zlín"], "Democratic Republic of the Congo": ["Bas-Uélé", "Équateur", "Haut-Katanga", "Haut-Lomami", "Haut-Uélé", "Ituri", "Kasaï", "Kasaï Oriental", "Kinshasa", "Kongo Central", "Kwango", "Kwilu", "Lomami", "Lualaba", "Mai-Ndombe", "Maniema", "Mongala", "Nord-Kivu", "Nord-Ubangi", "Sankuru", "Sud-Kivu", "Sud-Ubangi", "Tanganyika", "Tshopo", "Tshuapa"], "Denmark": ["Capital Region of Denmark", "Central Denmark Region", "North Denmark Region", "Region of Southern Denmark", "Region Zealand"], "Djibouti": ["Ali Sabieh Region", "Arta Region", "Dikhil Region", "Djibouti", "Obock Region", "Tadjourah Region"], "Dominica": ["Saint Andrew Parish", "Saint David Parish", "Saint Joseph Parish", "Saint Luke Parish", "Saint Mark Parish", "Saint Patrick Parish"], "Dominican Republic": ["Azua Province", "Baoruco Province", "Barahona Province", "Dajabón Province", "Distrito Nacional", "Duarte Province", "El Seibo Province", "Espaillat Province", "Hato Mayor Province", "Hermanas Mirabal Province", "Independencia", "La Altagracia Province", "La Romana Province", "La Vega Province", "María Trinidad Sánchez Province", "Monseñor Nouel Province", "Monte Cristi Province", "Monte Plata Province", "Pedernales Province", "Peravia Province", "Puerto Plata Province", "Samaná Province", "San Cristóbal Province", "San José de Ocoa Province", "San Juan Province", "San Pedro de Macorís", "Sánchez Ramírez Province", "Santiago Province", "Santiago Rodríguez Province", "Santo Domingo Province", "Valverde Province"], "Ecuador": ["Azuay", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Manabí", "Morona-Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"], "Egypt": ["Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia", "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr el-Sheikh", "Luxor", "Matrouh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez"], "El Salvador": ["Ahuachapán Department", "Cabañas Department", "Chalatenango Department", "Cuscatlán Department", "La Libertad Department", "La Unión Department", "Morazán Department", "San Miguel Department", "San Salvador Department", "San Vicente Department", "Santa Ana Department", "Sonsonate Department", "Usulután Department"], "Equatorial Guinea": ["Annobón Province", "Bioko Norte Province", "Bioko Sur Province", "Centro Sur Province", "Kié-Ntem Province", "Litoral Province", "Wele-Nzas Province"], "Eritrea": ["Anseba Region", "Debub Region", "Gash-Barka Region", "Maekel Region", "Northern Red Sea Region", "Southern Red Sea Region"], "Estonia": ["Harju County", "Hiiu County", "Ida-Viru County", "Järva County", "Jõgeva County", "Lääne County", "Lääne-Viru County", "Pärnu County", "Põlva County", "Rapla County", "Saare County", "Tartu County", "Valga County", "Viljandi County", "Võru County"], "Eswatini": ["Hhohho District", "Lubombo District", "Manzini District", "Shiselweni District"], "Ethiopia": ["Addis Ababa", "Afar Region", "Amhara Region", "Benishangul-Gumuz Region", "Dire Dawa", "Gambela Region", "Harari Region", "Oromia Region", "Somali Region", "Southern Nations, Nationalities, and Peoples' Region", "Tigray Region"], "Faroe Islands": ["Eysturoy", "Northern Isles", "Sandoy", "Streymoy", "Suðuroy", "Vágar"], "Fiji Islands": ["Central Division", "Eastern Division", "Northern Division", "Western Division"], "Finland": ["Åland Islands", "Central Finland", "Central Ostrobothnia", "Finland Proper", "Kainuu", "Kymenlaakso", "Lapland", "North Karelia", "Northern Ostrobothnia", "Ostrobothnia", "Päijänne Tavastia", "Pirkanmaa", "Satakunta", "South Karelia", "Southern Ostrobothnia", "Southern Savonia", "Tavastia Proper", "Uusimaa"], "France": ["Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse", "Grand-Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie", "Pays-de-la-Loire", "Provence-Alpes-Côte-d’Azur"], "Gabon": ["Estuaire Province", "Haut-Ogooué Province", "Moyen-Ogooué Province", "Ngounié Province", "Nyanga Province", "Ogooué-Ivindo Province", "Ogooué-Lolo Province", "Ogooué-Maritime Province", "Woleu-Ntem Province"], "Georgia": ["Abkhazia", "Adjara", "Guria", "Imereti", "Kakheti", "Kvemo Kartli", "Mtskheta-Mtianeti", "Racha-Lechkhumi and Kvemo Svaneti", "Samegrelo-Zemo Svaneti", "Samtskhe-Javakheti", "Shida Kartli", "Tbilisi"], "Germany": ["Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"], "Ghana": ["Ahafo", "Ashanti", "Bono", "Bono East", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", "Western", "Western North"], "Greece": ["Attica Region", "Central Greece Region", "Central Macedonia", "Corfu Prefecture", "Crete Region", "East Attica Regional Unit", "Epirus Region", "Ionian Islands Region", "Kefalonia Prefecture", "Lefkada Regional Unit", "Peloponnese Region", "South Aegean", "West Greece Region", "West Macedonia Region"], "Grenada": ["Carriacou and Petite Martinique"], "Guatemala": ["Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán"], "Guinea": ["Boké Region", "Conakry", "Kankan Region", "Kindia Region", "Labé Region", "Mamou Region", "Nzérékoré Region"], "Guinea-Bissau": ["Bafatá", "Biombo Region", "Bolama Region", "Cacheu Region", "Gabú Region", "Oio Region", "Quinara Region", "Tombali Region"], "Guyana": ["Barima-Waini", "Cuyuni-Mazaruni", "Demerara-Mahaica", "East Berbice-Corentyne", "Essequibo Islands-West Demerara", "Mahaica-Berbice", "Pomeroon-Supenaam", "Potaro-Siparuni", "Upper Demerara-Berbice", "Upper Takutu-Upper Essequibo"], "Haiti": ["Artibonite", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"], "Honduras": ["Atlántida Department", "Bay Islands Department", "Choluteca Department", "Colón Department", "Comayagua Department", "Copán Department", "Cortés Department", "El Paraíso Department", "Francisco Morazán Department", "Gracias a Dios Department", "Intibucá Department", "Lempira Department", "Ocotepeque Department", "Olancho Department", "Santa Bárbara Department", "Valle Department", "Yoro Department"], "Hong Kong": ["Central and Western", "Islands", "Kowloon City", "Kwun Tong", "Sai Kung", "Sha Tin", "Sham Shui Po", "Tai Po", "Tsuen Wan", "Wan Chai", "Wong Tai Sin", "Yau Tsim Mong", "Yuen Long"], "Hungary": ["Bács-Kiskun", "Baranya", "Békés", "Borsod-Abaúj-Zemplén", "Budapest", "Csongrád County", "Fejér County", "Győr-Moson-Sopron County", "Hajdú-Bihar County", "Heves County", "Jász-Nagykun-Szolnok County", "Komárom-Esztergom", "Nógrád County", "Pest County", "Somogy County", "Szabolcs-Szatmár-Bereg County", "Tolna County", "Vas County", "Veszprém County", "Zala County"], "Iceland": ["Capital Region", "Eastern Region", "Northeastern Region", "Northwestern Region", "Southern Peninsula Region", "Southern Region", "Western Region", "Westfjords"], "India": ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"], "Indonesia": ["Aceh", "Bali", "Banten", "Bengkulu", "DI Yogyakarta", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur", "Kalimantan Utara", "Kepulauan Bangka Belitung", "Kepulauan Riau", "Lampung", "Maluku", "Maluku Utara", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Pegunungan", "Papua Selatan", "Papua Tengah", "Riau", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara", "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara"], "Iran": ["Alborz", "Ardabil", "Bushehr", "Chaharmahal and Bakhtiari", "East Azerbaijan", "Fars", "Gilan", "Golestan", "Hamadan", "Hormozgan", "Ilam", "Isfahan", "Kerman", "Kermanshah", "Khuzestan", "Kohgiluyeh and Boyer-Ahmad", "Kurdistan", "Lorestan", "Markazi", "Mazandaran", "North Khorasan", "Qazvin", "Qom", "Razavi Khorasan", "Semnan", "Sistan and Baluchestan", "South Khorasan", "Tehran", "West Azarbaijan", "Yazd", "Zanjan"], "Iraq": ["Al Anbar", "Al Muthanna", "Al-Qādisiyyah", "Babylon", "Baghdad", "Basra", "Dhi Qar", "Diyala", "Dohuk", "Erbil", "Karbala", "Kirkuk", "Maysan", "Najaf", "Nineveh", "Saladin", "Sulaymaniyah", "Wasit"], "Ireland": ["Connacht", "Leinster", "Munster", "Ulster"], "Israel": ["Haifa District", "Jerusalem District", "Northern District", "Tel Aviv District"], "Italy": ["Abruzzo", "Aosta Valley", "Apulia", "Barletta-Andria-Trani", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", "Friuli–Venezia Giulia", "Lazio", "Liguria", "Lombardy", "Marche", "Molise", "Piedmont", "Ravenna", "Sardinia", "Sicily", "Trentino-South Tyrol", "Tuscany", "Umbria", "Veneto"], "Jamaica": ["Clarendon Parish", "Hanover Parish", "Kingston Parish", "Manchester Parish", "Portland Parish", "Saint Ann Parish", "Saint Catherine Parish", "Saint Elizabeth Parish", "Saint James Parish", "Saint Thomas Parish", "Trelawny Parish", "Westmoreland Parish"], "Japan": ["Aichi Prefecture", "Akita Prefecture", "Aomori Prefecture", "Chiba Prefecture", "Ehime Prefecture", "Fukui Prefecture", "Fukuoka Prefecture", "Fukushima Prefecture", "Gifu Prefecture", "Gunma Prefecture", "Hiroshima Prefecture", "Hokkaidō Prefecture", "Hyōgo Prefecture", "Ibaraki Prefecture", "Ishikawa Prefecture", "Iwate Prefecture", "Kagawa Prefecture", "Kagoshima Prefecture", "Kanagawa Prefecture", "Kōchi Prefecture", "Kumamoto Prefecture", "Kyōto Prefecture", "Mie Prefecture", "Miyagi Prefecture", "Miyazaki Prefecture", "Nagano Prefecture", "Nagasaki Prefecture", "Nara Prefecture", "Niigata Prefecture", "Ōita Prefecture", "Okayama Prefecture", "Okinawa Prefecture", "Ōsaka Prefecture", "Saga Prefecture", "Saitama Prefecture", "Shiga Prefecture", "Shimane Prefecture", "Shizuoka Prefecture", "Tochigi Prefecture", "Tokushima Prefecture", "Tokyo", "Tottori Prefecture", "Toyama Prefecture", "Wakayama Prefecture", "Yamagata Prefecture", "Yamaguchi Prefecture", "Yamanashi Prefecture"], "Jordan": ["Ajloun", "Amman", "Aqaba", "Balqa", "Irbid", "Jerash", "Karak", "Ma'an", "Madaba", "Mafraq", "Tafilah", "Zarqa"], "Kazakhstan": ["Akmola Region", "Aktobe Region", "Almaty", "Almaty Region", "Atyrau Region", "Baikonur", "East Kazakhstan Region", "Jambyl Region", "Karaganda Region", "Kostanay Region", "Kyzylorda Region", "Mangystau Region", "North Kazakhstan Region", "Nur-Sultan", "Pavlodar Region", "Turkestan Region", "West Kazakhstan Province"], "Kenya": ["Baringo", "Bomet", "Bungoma", "Busia", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi City", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Wajir", "West Pokot"], "Kiribati": ["Gilbert Islands", "Line Islands", "Phoenix Islands"], "Kuwait": ["Al Ahmadi", "Al Farwaniyah", "Al Jahra", "Hawalli", "Mubarak Al-Kabeer"], "Kyrgyzstan": ["Batken Region", "Bishkek", "Chuy Region", "Issyk-Kul Region", "Jalal-Abad Region", "Naryn Region", "Osh Region", "Talas Region"], "Laos": ["Attapeu Province", "Bokeo Province", "Bolikhamsai Province", "Champasak Province", "Houaphanh Province", "Khammouane Province", "Luang Namtha Province", "Luang Prabang Province", "Oudomxay Province", "Phongsaly Province", "Sainyabuli Province", "Salavan Province", "Savannakhet Province", "Sekong Province", "Vientiane Prefecture", "Vientiane Province", "Xaisomboun Province", "Xiangkhouang Province"], "Latvia": ["Aglona Municipality", "Aizkraukle Municipality", "Aizpute Municipality", "Aknīste Municipality", "Aloja Municipality", "Alsunga Municipality", "Alūksne Municipality", "Ape Municipality", "Auce Municipality", "Babīte Municipality", "Baldone Municipality", "Baltinava Municipality", "Balvi Municipality", "Bauska Municipality", "Beverīna Municipality", "Brocēni Municipality", "Carnikava Municipality", "Cēsis Municipality", "Cesvaine Municipality", "Cibla Municipality", "Dagda Municipality", "Daugavpils Municipality", "Dobele Municipality", "Dundaga Municipality", "Durbe Municipality", "Engure Municipality", "Ērgļi Municipality", "Garkalne Municipality", "Grobiņa Municipality", "Gulbene Municipality", "Iecava Municipality", "Ikšķile Municipality", "Ilūkste Municipality", "Inčukalns Municipality", "Jaunjelgava Municipality", "Jaunpils Municipality", "Jēkabpils Municipality", "Jelgava", "Jelgava Municipality", "Jūrmala", "Kandava Municipality", "Kārsava Municipality", "Ķegums Municipality", "Ķekava Municipality", "Kocēni Municipality", "Koknese Municipality", "Krāslava Municipality", "Kuldīga Municipality", "Lielvārde Municipality", "Liepāja", "Līgatne Municipality", "Limbaži Municipality", "Līvāni Municipality", "Lubāna Municipality", "Ludza Municipality", "Madona Municipality", "Mālpils Municipality", "Mārupe Municipality", "Mazsalaca Municipality", "Naukšēni Municipality", "Nereta Municipality", "Nīca Municipality", "Ogre Municipality", "Olaine Municipality", "Ozolnieki Municipality", "Pārgauja Municipality", "Pāvilosta Municipality", "Pļaviņas Municipality", "Preiļi Municipality", "Priekule Municipality", "Priekuļi Municipality", "Rauna Municipality", "Rēzekne", "Riebiņi Municipality", "Riga", "Roja Municipality", "Ropaži Municipality", "Rucava Municipality", "Rugāji Municipality", "Rūjiena Municipality", "Rundāle Municipality", "Salacgrīva Municipality", "Salaspils Municipality", "Saldus Municipality", "Saulkrasti Municipality", "Sēja Municipality", "Sigulda Municipality", "Skrīveri Municipality", "Skrunda Municipality", "Smiltene Municipality", "Stopiņi Municipality", "Strenči Municipality", "Talsi Municipality", "Tērvete Municipality", "Vaiņode Municipality", "Valka Municipality", "Valmiera", "Varakļāni Municipality", "Vārkava Municipality", "Vecpiebalga Municipality", "Vecumnieki Municipality", "Ventspils", "Ventspils Municipality", "Viesīte Municipality", "Viļaka Municipality", "Viļāni Municipality", "Zilupe Municipality"], "Lebanon": ["Akkar", "Baalbek-Hermel", "Beirut", "Beqaa", "Mount Lebanon", "Nabatieh"], "Lesotho": ["Berea District", "Butha-Buthe District", "Leribe District", "Mafeteng District", "Maseru District", "Mohale's Hoek District", "Mokhotlong District", "Qacha's Nek District", "Quthing District", "Thaba-Tseka District"], "Liberia": ["Bomi County", "Bong County", "Gbarpolu County", "Grand Bassa County", "Grand Cape Mount County", "Grand Gedeh County", "Grand Kru County", "Lofa County", "Margibi County", "Maryland County", "Montserrado County", "Nimba", "River Cess County", "River Gee County", "Sinoe County"], "Libya": ["Al Wahat District", "Benghazi", "Derna District", "Ghat District", "Jabal al Akhdar", "Jabal al Gharbi District", "Jafara", "Jufra", "Kufra District", "Marj District", "Misrata District", "Murqub", "Murzuq District", "Nalut District", "Nuqat al Khams", "Sabha District", "Sirte District", "Tripoli District", "Wadi al Hayaa District", "Wadi al Shatii District", "Zawiya District"], "Liechtenstein": ["Balzers", "Eschen", "Gamprin", "Mauren", "Planken", "Ruggell", "Schaan", "Schellenberg", "Triesen", "Triesenberg", "Vaduz"], "Lithuania": ["Alytus City Municipality", "Kaunas City Municipality", "Klaipėda District Municipality", "Marijampolė Municipality", "Panevėžys District Municipality", "Šiauliai City Municipality", "Tauragė County", "Telšiai District Municipality", "Utena County", "Vilnius City Municipality"], "Luxembourg": ["Canton of Capellen", "Canton of Clervaux", "Canton of Diekirch", "Canton of Echternach", "Canton of Esch-sur-Alzette", "Canton of Grevenmacher", "Canton of Luxembourg", "Canton of Mersch", "Canton of Redange", "Canton of Remich", "Canton of Vianden", "Canton of Wiltz"], "Madagascar": ["Antsiranana Province"], "Malawi": ["Central Region", "Northern Region"], "Malaysia": ["Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Malacca", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Putrajaya", "Sabah", "Sarawak", "Selangor", "Terengganu"], "Maldives": ["Addu Atoll", "Dhaalu Atoll", "Gaafu Alif Atoll", "Gaafu Dhaalu Atoll", "Gnaviyani Atoll", "Haa Alif Atoll", "Haa Dhaalu Atoll", "Kaafu Atoll", "Laamu Atoll", "Lhaviyani Atoll", "Meemu Atoll", "Noonu Atoll", "Raa Atoll", "Shaviyani Atoll", "South Central Province", "Thaa Atoll", "Vaavu Atoll"], "Mali": ["Bamako", "Gao Region", "Kayes Region", "Kidal Region", "Koulikoro Region", "Mopti Region", "Ségou Region", "Sikasso Region", "Tombouctou Region"], "Malta": ["Attard", "Balzan", "Birgu", "Birkirkara", "Birżebbuġa", "Cospicua", "Dingli", "Fgura", "Floriana", "Fontana", "Għajnsielem", "Għargħur", "Għasri", "Għaxaq", "Gżira", "Ħamrun", "Iklin", "Kalkara", "Kerċem", "Kirkop", "Lija", "Luqa", "Marsa", "Marsaskala", "Marsaxlokk", "Mellieħa", "Mġarr", "Mosta", "Msida", "Munxar", "Nadur", "Naxxar", "Paola", "Pembroke", "Pietà", "Qala", "Qormi", "Qrendi", "Rabat", "San Ġwann", "San Lawrenz", "Sannat", "Santa Luċija", "Senglea", "Siġġiewi", "Sliema", "St. Julian's", "St. Paul's Bay", "Swieqi", "Ta' Xbiex", "Tarxien", "Valletta", "Xagħra", "Xewkija", "Xgħajra", "Żabbar", "Żebbuġ Gozo", "Żebbuġ Malta", "Żejtun", "Żurrieq"], "Mauritania": ["Assaba", "Brakna", "Dakhlet Nouadhibou", "Gorgol", "Guidimaka", "Hodh Ech Chargui", "Hodh El Gharbi", "Inchiri", "Nouakchott-Nord", "Nouakchott-Ouest", "Nouakchott-Sud", "Tagant", "Tiris Zemmour", "Trarza"], "Mauritius": ["Agalega Islands", "Black River", "Flacq", "Grand Port", "Moka", "Pamplemousses", "Plaines Wilhems", "Port Louis", "Rivière du Rempart", "Rodrigues Island", "Saint Brandon Islands", "Savanne"], "Mexico": ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila de Zaragoza", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán de Ocampo", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz de Ignacio de la Llave", "Yucatán", "Zacatecas"], "Micronesia": ["Chuuk State", "Kosrae State", "Pohnpei State", "Yap State"], "Moldova": ["Anenii Noi District", "Bălți Municipality", "Basarabeasca District", "Bender Municipality", "Briceni District", "Cahul District", "Călărași District", "Cantemir District", "Căușeni District", "Chișinău Municipality", "Cimișlia District", "Criuleni District", "Dondușeni District", "Drochia District", "Dubăsari District", "Edineț District", "Fălești District", "Florești District", "Gagauzia", "Glodeni District", "Hîncești District", "Ialoveni District", "Nisporeni District", "Ocnița District", "Orhei District", "Rezina District", "Rîșcani District", "Sîngerei District", "Șoldănești District", "Soroca District", "Ștefan Vodă District", "Strășeni District", "Taraclia District", "Telenești District", "Transnistria autonomous territorial unit", "Ungheni District"], "Mongolia": ["Arkhangai Province", "Bayan-Ölgii Province", "Bayankhongor Province", "Bulgan Province", "Darkhan-Uul Province", "Dornod Province", "Dundgovi Province", "Govi-Altai Province", "Govisümber Province", "Khentii Province", "Khovd Province", "Khövsgöl Province", "Ömnögovi Province", "Orkhon Province", "Övörkhangai Province", "Selenge Province", "Sükhbaatar Province", "Töv Province", "Uvs Province", "Zavkhan Province"], "Montenegro": ["Andrijevica Municipality", "Bar Municipality", "Berane Municipality", "Bijelo Polje Municipality", "Budva Municipality", "Danilovgrad Municipality", "Gusinje Municipality", "Kolašin Municipality", "Kotor Municipality", "Mojkovac Municipality", "Nikšić Municipality", "Old Royal Capital Cetinje", "Plav Municipality", "Pljevlja Municipality", "Plužine Municipality", "Podgorica Municipality", "Rožaje Municipality", "Šavnik Municipality", "Tivat Municipality", "Ulcinj Municipality", "Žabljak Municipality"], "Morocco": ["Assa-Zag (EH-partial)", "Casablanca-Settat", "Drâa-Tafilalet", "Fès-Meknès", "Guelmim-Oued Noun (EH-partial)", "Kénitra", "Khénifra", "L'Oriental", "Laâyoune-Sakia El Hamra (EH-partial)", "Oued Ed-Dahab (EH)", "Safi", "Tanger-Tétouan-Al Hoceïma"], "Mozambique": ["Cabo Delgado Province", "Gaza Province", "Inhambane Province", "Manica Province", "Maputo", "Maputo Province", "Nampula Province", "Niassa Province", "Sofala Province", "Tete Province", "Zambezia Province"], "Myanmar": ["Ayeyarwady Region", "Bago", "Chin State", "Kachin State", "Kayah State", "Kayin State", "Magway Region", "Mandalay Region", "Mon State", "Naypyidaw Union Territory", "Rakhine State", "Sagaing Region", "Shan State", "Tanintharyi Region", "Yangon Region"], "Namibia": ["Erongo Region", "Hardap Region", "Karas Region", "Kavango East Region", "Khomas Region", "Kunene Region", "Ohangwena Region", "Omaheke Region", "Omusati Region", "Oshana Region", "Oshikoto Region", "Otjozondjupa Region", "Zambezi Region"], "Nauru": ["Aiwo District", "Anabar District", "Baiti District", "Ijuw District", "Meneng District", "Uaboe District", "Yaren District"], "Nepal": ["Bagmati", "Gandaki", "Karnali", "Koshi", "Lumbini", "Madhesh", "Sudurpashchim"], "Netherlands": ["Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg", "North Brabant", "North Holland", "Overijssel", "South Holland", "Utrecht", "Zeeland"], "New Caledonia": ["Loyalty Islands Province", "North Province", "South Province"], "New Zealand": ["Auckland Region", "Bay of Plenty Region", "Canterbury Region", "Chatham Islands", "Gisborne District", "Hawke's Bay Region", "Manawatu-Wanganui Region", "Marlborough Region", "Nelson Region", "Northland Region", "Otago Region", "Southland Region", "Taranaki Region", "Tasman District", "Waikato Region", "Wellington Region", "West Coast Region"], "Nicaragua": ["Boaco", "Carazo", "Chinandega", "Chontales", "Estelí", "Granada", "Jinotega", "León", "Madriz", "Managua", "Masaya", "Matagalpa", "North Caribbean Coast", "Nueva Segovia", "Río San Juan", "Rivas", "South Caribbean Coast"], "Niger": ["Agadez Region", "Diffa Region", "Dosso Region", "Maradi Region", "Tahoua Region", "Tillabéri Region", "Zinder Region"], "Nigeria": ["Abia", "Abuja Federal Capital Territory", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"], "North Korea": ["Chagang Province", "Kangwon Province", "North Hamgyong Province", "North Hwanghae Province", "North Pyongan Province", "Pyongyang", "Rason", "Ryanggang Province", "South Hamgyong Province", "South Hwanghae Province", "South Pyongan Province"], "North Macedonia": ["Aračinovo Municipality", "Berovo Municipality", "Bitola Municipality", "Bogdanci Municipality", "Bogovinje Municipality", "Bosilovo Municipality", "Brvenica Municipality", "Butel Municipality", "Čair Municipality", "Čaška Municipality", "Centar Župa Municipality", "Češinovo-Obleševo Municipality", "Čučer-Sandevo Municipality", "Debarca Municipality", "Delčevo Municipality", "Demir Hisar Municipality", "Demir Kapija Municipality", "Dojran Municipality", "Dolneni Municipality", "Gazi Baba Municipality", "Gevgelija Municipality", "Gjorče Petrov Municipality", "Gostivar Municipality", "Gradsko Municipality", "Greater Skopje", "Ilinden Municipality", "Jegunovce Municipality", "Karbinci", "Karpoš Municipality", "Kavadarci Municipality", "Kičevo Municipality", "Kisela Voda Municipality", "Kočani Municipality", "Konče Municipality", "Kratovo Municipality", "Kriva Palanka Municipality", "Krivogaštani Municipality", "Kruševo Municipality", "Kumanovo Municipality", "Lipkovo Municipality", "Lozovo Municipality", "Makedonska Kamenica Municipality", "Makedonski Brod Municipality", "Mavrovo and Rostuša Municipality", "Mogila Municipality", "Negotino Municipality", "Novaci Municipality", "Novo Selo Municipality", "Ohrid Municipality", "Pehčevo Municipality", "Petrovec Municipality", "Plasnica Municipality", "Prilep Municipality", "Probištip Municipality", "Radoviš Municipality", "Rankovce Municipality", "Resen Municipality", "Rosoman Municipality", "Saraj Municipality", "Sopište Municipality", "Staro Nagoričane Municipality", "Štip Municipality", "Struga Municipality", "Strumica Municipality", "Studeničani Municipality", "Šuto Orizari Municipality", "Sveti Nikole Municipality", "Tearce Municipality", "Tetovo Municipality", "Valandovo Municipality", "Vasilevo Municipality", "Veles Municipality", "Vevčani Municipality", "Vinica Municipality", "Vrapčište Municipality", "Zelenikovo Municipality", "Želino Municipality", "Zrnovci Municipality"], "Norway": ["Agder", "Innlandet", "Møre og Romsdal", "Nordland", "Oslo", "Rogaland", "Troms og Finnmark", "Trøndelag", "Vestfold og Telemark", "Vestland", "Viken"], "Oman": ["Ad Dakhiliyah", "Ad Dhahirah", "Al Batinah North", "Al Batinah Region", "Al Buraimi", "Al Wusta", "Ash Sharqiyah Region", "Dhofar", "Musandam", "Muscat"], "Pakistan": ["Azad Kashmir", "Balochistan", "Federally Administered Tribal Areas", "Gilgit-Baltistan", "Islamabad Capital Territory", "Khyber Pakhtunkhwa", "Sindh"], "Palau": ["Aimeliik", "Airai", "Angaur", "Hatohobei", "Kayangel", "Koror", "Melekeok", "Ngaraard", "Ngarchelong", "Ngardmau", "Ngchesar", "Ngeremlengui", "Ngiwal", "Peleliu", "Sonsorol"], "Palestine": ["Bethlehem", "Deir El Balah", "Gaza", "Hebron", "Jenin", "Jericho", "Jerusalem (Quds)", "Khan Yunis", "Nablus", "North Gaza", "Qalqilya", "Rafah", "Ramallah", "Salfit", "Tubas", "Tulkarm"], "Panama": ["Bocas del Toro Province", "Chiriquí Province", "Coclé Province", "Colón Province", "Darién Province", "Emberá-Wounaan Comarca", "Guna Yala", "Herrera Province", "Los Santos Province", "Ngöbe-Buglé Comarca", "Panamá Oeste Province", "Panamá Province", "Veraguas Province"], "Papua New Guinea": ["Bougainville", "Central Province", "Chimbu Province", "East New Britain", "Eastern Highlands Province", "Enga Province", "Gulf", "Hela", "Jiwaka Province", "Madang Province", "Manus Province", "Milne Bay Province", "Morobe Province", "New Ireland Province", "Oro Province", "Port Moresby", "Sandaun Province", "Southern Highlands Province", "West New Britain Province", "Western Highlands Province", "Western Province"], "Paraguay": ["Alto Paraguay Department", "Alto Paraná Department", "Amambay Department", "Boquerón Department", "Caaguazú", "Caazapá", "Canindeyú", "Central Department", "Concepción Department", "Cordillera Department", "Guairá Department", "Itapúa", "Misiones Department", "Ñeembucú Department", "Paraguarí Department", "Presidente Hayes Department", "San Pedro Department"], "Peru": ["Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco", "Huancavelica", "Huanuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali"], "Philippines": ["Abra", "Agusan del Norte", "Agusan del Sur", "Albay", "Antique", "Autonomous Region in Muslim Mindanao", "Bataan", "Batanes", "Benguet", "Bohol", "Bukidnon", "Bulacan", "Cagayan", "Cagayan Valley", "Camarines Norte", "Caraga", "Central Luzon", "Cordillera Administrative", "Davao", "Davao Occidental", "Eastern Visayas", "Ilocos", "Metro Manila", "Occidental Mindoro", "Oriental Mindoro", "Soccsksargen", "Zamboanga Sibugay"], "Poland": ["Greater Poland", "Holy Cross", "Kuyavia-Pomerania", "Lesser Poland", "Lower Silesia", "Lublin", "Lubusz", "Łódź", "Mazovia", "Podlaskie", "Pomerania", "Silesia", "Subcarpathia", "Upper Silesia", "Warmia-Masuria", "West Pomerania"], "Portugal": ["Açores", "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora", "Faro", "Guarda", "Leiria", "Lisbon", "Madeira", "Portalegre", "Porto", "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu"], "Puerto Rico": ["Adjuntas", "Aguada", "Aguadilla", "Aguas Buenas", "Aibonito", "Añasco", "Arecibo", "Arroyo", "Barceloneta", "Barranquitas", "Bayamón", "Cabo Rojo", "Caguas", "Camuy", "Canóvanas", "Carolina", "Cataño", "Cayey", "Ceiba", "Ciales", "Cidra", "Coamo", "Comerío", "Corozal", "Culebra", "Dorado", "Fajardo", "Florida", "Guánica", "Guayama", "Guayanilla", "Guaynabo", "Gurabo", "Hatillo", "Hormigueros", "Humacao", "Isabela", "Jayuya", "Juana Díaz", "Juncos", "Lajas", "Lares", "Las Marías", "Las Piedras", "Loíza", "Luquillo", "Manatí", "Maricao", "Maunabo", "Mayagüez", "Moca", "Morovis", "Naguabo", "Naranjito", "Orocovis", "Patillas", "Peñuelas", "Ponce", "Quebradillas", "Rincón", "Río Grande", "Sabana Grande", "Salinas", "San Germán", "San Lorenzo", "San Sebastián", "Santa Isabel", "Toa Alta", "Toa Baja", "Trujillo Alto", "Utuado", "Vega Alta", "Vega Baja", "Vieques", "Villalba", "Yabucoa", "Yauco"], "Qatar": ["Al Khor", "Al Rayyan Municipality", "Al Wakrah", "Al-Shahaniya", "Doha", "Madinat ash Shamal", "Umm Salal Municipality"], "Romania": ["Alba", "Arad County", "Arges", "Bacău County", "Bihor County", "Bistrița-Năsăud County", "Botoșani County", "Braila", "Brașov County", "Bucharest", "Buzău County", "Călărași County", "Caraș-Severin County", "Cluj County", "Constanța County", "Covasna County", "Dâmbovița County", "Dolj County", "Galați County", "Giurgiu County", "Gorj County", "Harghita County", "Hunedoara County", "Ialomița County", "Iași County", "Ilfov County", "Maramureș County", "Mehedinți County", "Mureș County", "Neamț County", "Olt County", "Prahova County", "Sălaj County", "Satu Mare County", "Sibiu County", "Suceava County", "Teleorman County", "Timiș County", "Tulcea County", "Vâlcea County", "Vaslui County", "Vrancea County"], "Russia": ["Altai Krai", "Altai Republic", "Amur Oblast", "Arkhangelsk", "Astrakhan Oblast", "Belgorod Oblast", "Bryansk Oblast", "Chechen Republic", "Chelyabinsk Oblast", "Chukotka Autonomous Okrug", "Chuvash Republic", "Ivanovo Oblast", "Jewish Autonomous Oblast", "Kabardino-Balkar Republic", "Kaliningrad", "Kaluga Oblast", "Kamchatka Krai", "Karachay-Cherkess Republic", "Kemerovo Oblast", "Khabarovsk Krai", "Khanty-Mansi Autonomous Okrug", "Kirov Oblast", "Komi Republic", "Kostroma Oblast", "Krasnodar Krai", "Krasnoyarsk Krai", "Kurgan Oblast", "Kursk Oblast", "Leningrad Oblast", "Lipetsk Oblast", "Magadan Oblast", "Mari El Republic", "Moscow", "Moscow Oblast", "Murmansk Oblast", "Nenets Autonomous Okrug", "Nizhny Novgorod Oblast", "Novgorod Oblast", "Novosibirsk", "Omsk Oblast", "Orenburg Oblast", "Oryol Oblast", "Penza Oblast", "Perm Krai", "Primorsky Krai", "Pskov Oblast", "Republic of Adygea", "Republic of Bashkortostan", "Republic of Buryatia", "Republic of Dagestan", "Republic of Ingushetia", "Republic of Kalmykia", "Republic of Karelia", "Republic of Khakassia", "Republic of Mordovia", "Republic of North Ossetia-Alania", "Republic of Tatarstan", "Rostov Oblast", "Ryazan Oblast", "Saint Petersburg", "Sakha Republic", "Sakhalin", "Samara Oblast", "Saratov Oblast", "Smolensk Oblast", "Stavropol Krai", "Sverdlovsk", "Tambov Oblast", "Tomsk Oblast", "Tula Oblast", "Tuva Republic", "Tver Oblast", "Tyumen Oblast", "Udmurt Republic", "Ulyanovsk Oblast", "Vladimir Oblast", "Volgograd Oblast", "Vologda Oblast", "Voronezh Oblast", "Yamalo-Nenets Autonomous Okrug", "Yaroslavl Oblast", "Zabaykalsky Krai"], "Rwanda": ["Eastern Province", "Kigali district", "Northern Province", "Southern Province"], "Saint Kitts and Nevis": ["Christ Church Nichola Town Parish", "Saint Anne Sandy Point Parish", "Saint George Gingerland Parish", "Saint James Windward Parish", "Saint John Capisterre Parish", "Saint John Figtree Parish", "Saint Mary Cayon Parish", "Saint Paul Capisterre Parish", "Saint Paul Charlestown Parish", "Saint Peter Basseterre Parish", "Saint Thomas Lowland Parish", "Saint Thomas Middle Island Parish", "Trinity Palmetto Point Parish"], "Saint Lucia": ["Anse la Raye Quarter", "Canaries", "Castries Quarter", "Choiseul Quarter", "Dennery Quarter", "Gros Islet Quarter", "Laborie Quarter", "Micoud Quarter", "Soufrière Quarter", "Vieux Fort Quarter"], "Saint Vincent and the Grenadines": ["Charlotte Parish", "Grenadines Parish"], "Samoa": ["A'ana", "Aiga-i-le-Tai", "Atua", "Gaga'ifomauga", "Palauli", "Tuamasaga", "Va'a-o-Fonoti", "Vaisigano"], "San Marino": ["Acquaviva", "Borgo Maggiore", "Chiesanuova", "Domagnano", "Faetano", "Fiorentino", "Montegiardino", "San Marino", "Serravalle"], "Sao Tome and Principe": ["Príncipe Province", "São Tomé Province"], "Saudi Arabia": ["Asir", "Al Bahah", "Al Jawf", "Al Madinah", "Al-Qassim", "Ha'il", "Jizan", "Makkah", "Najran", "Northern Borders", "Riyadh", "Tabuk"], "Senegal": ["Dakar", "Diourbel Region", "Fatick", "Kaffrine", "Kaolack", "Kédougou", "Kolda", "Louga", "Matam", "Saint-Louis", "Sédhiou", "Tambacounda Region", "Thiès Region", "Ziguinchor"], "Serbia": ["Central Banat District", "Vojvodina"], "Seychelles": ["Anse Boileau", "Anse Royale", "Beau Vallon", "Bel Ombre", "Cascade", "La Rivière Anglaise", "Port Glaud", "Takamaka"], "Sierra Leone": ["Western Area"], "Singapore": ["Central Singapore", "North West", "South East", "South West"], "Slovakia": ["Banská Bystrica Region", "Bratislava Region", "Košice Region", "Nitra Region", "Prešov Region", "Trenčín Region", "Trnava Region", "Žilina Region"], "Slovenia": ["Ajdovščina Municipality", "Ankaran Municipality", "Beltinci Municipality", "Benedikt Municipality", "Bistrica ob Sotli Municipality", "Bled Municipality", "Bloke Municipality", "Bohinj Municipality", "Borovnica Municipality", "Bovec Municipality", "Braslovče Municipality", "Brda Municipality", "Brežice Municipality", "Brezovica Municipality", "Cankova Municipality", "Cerklje na Gorenjskem Municipality", "Cerknica Municipality", "Cerkno Municipality", "Cerkvenjak Municipality", "City Municipality of Celje", "City Municipality of Novo Mesto", "Črenšovci Municipality", "Črna na Koroškem Municipality", "Črnomelj Municipality", "Destrnik Municipality", "Divača Municipality", "Dobje Municipality", "Dobrepolje Municipality", "Dobrna Municipality", "Dobrova–Polhov Gradec Municipality", "Dobrovnik Municipality", "Dol pri Ljubljani Municipality", "Dolenjske Toplice Municipality", "Domžale Municipality", "Dornava Municipality", "Dravograd Municipality", "Duplek Municipality", "Gorenja Vas–Poljane Municipality", "Gorišnica Municipality", "Gornja Radgona Municipality", "Gornji Grad Municipality", "Gornji Petrovci Municipality", "Grad Municipality", "Grosuplje Municipality", "Hajdina Municipality", "Hoče–Slivnica Municipality", "Hodoš Municipality", "Horjul Municipality", "Hrastnik Municipality", "Hrpelje–Kozina Municipality", "Idrija Municipality", "Ig Municipality", "Ivančna Gorica Municipality", "Izola Municipality", "Jesenice Municipality", "Jezersko Municipality", "Juršinci Municipality", "Kamnik Municipality", "Kanal ob Soči Municipality", "Kidričevo Municipality", "Kobarid Municipality", "Kobilje Municipality", "Kočevje Municipality", "Komen Municipality", "Komenda Municipality", "Koper City Municipality", "Kostel Municipality", "Kozje Municipality", "Kranj City Municipality", "Kranjska Gora Municipality", "Križevci Municipality", "Kungota", "Kuzma Municipality", "Laško Municipality", "Lenart Municipality", "Lendava Municipality", "Litija Municipality", "Ljubljana City Municipality", "Ljubno Municipality", "Ljutomer Municipality", "Logatec Municipality", "Loška Dolina Municipality", "Loški Potok Municipality", "Lovrenc na Pohorju Municipality", "Luče Municipality", "Lukovica Municipality", "Majšperk Municipality", "Maribor City Municipality", "Markovci Municipality", "Medvode Municipality", "Mengeš Municipality", "Metlika Municipality", "Mežica Municipality", "Miklavž na Dravskem Polju Municipality", "Miren–Kostanjevica Municipality", "Mirna Peč Municipality", "Mislinja Municipality", "Moravče Municipality", "Moravske Toplice Municipality", "Mozirje Municipality", "Municipality of Apače", "Municipality of Ilirska Bistrica", "Municipality of Krško", "Municipality of Škofljica", "Murska Sobota City Municipality", "Muta Municipality", "Naklo Municipality", "Nazarje Municipality", "Nova Gorica City Municipality", "Odranci Municipality", "Oplotnica", "Ormož Municipality", "Osilnica Municipality", "Pesnica Municipality", "Piran Municipality", "Pivka Municipality", "Podčetrtek Municipality", "Podlehnik Municipality", "Podvelka Municipality", "Polzela Municipality", "Postojna Municipality", "Prebold Municipality", "Preddvor Municipality", "Prevalje Municipality", "Ptuj City Municipality", "Puconci Municipality", "Rače–Fram Municipality", "Radeče Municipality", "Radenci Municipality", "Radlje ob Dravi Municipality", "Radovljica Municipality", "Ravne na Koroškem Municipality", "Razkrižje Municipality", "Renče–Vogrsko Municipality", "Ribnica Municipality", "Ribnica na Pohorju Municipality", "Rogaška Slatina Municipality", "Rogašovci Municipality", "Rogatec Municipality", "Ruše Municipality", "Šalovci Municipality", "Selnica ob Dravi Municipality", "Semič Municipality", "Šempeter–Vrtojba Municipality", "Šenčur Municipality", "Šentilj Municipality", "Šentjernej Municipality", "Šentjur Municipality", "Šentrupert Municipality", "Sevnica Municipality", "Sežana Municipality", "Škocjan Municipality", "Škofja Loka Municipality", "Slovenj Gradec City Municipality", "Slovenska Bistrica Municipality", "Slovenske Konjice Municipality", "Šmarje pri Jelšah Municipality", "Šmarješke Toplice Municipality", "Šmartno ob Paki Municipality", "Šmartno pri Litiji Municipality", "Sodražica Municipality", "Solčava Municipality", "Šoštanj Municipality", "Središče ob Dravi", "Starše Municipality", "Štore Municipality", "Straža Municipality", "Sveta Ana Municipality", "Sveta Trojica v Slovenskih Goricah Municipality", "Sveti Andraž v Slovenskih Goricah Municipality", "Sveti Jurij v Slovenskih Goricah Municipality", "Sveti Tomaž Municipality", "Tabor Municipality", "Tišina Municipality", "Tolmin Municipality", "Trbovlje Municipality", "Trebnje Municipality", "Trnovska Vas Municipality", "Tržič Municipality", "Trzin Municipality", "Turnišče Municipality", "Velika Polana Municipality", "Velike Lašče Municipality", "Veržej Municipality", "Videm Municipality", "Vipava Municipality", "Vitanje Municipality", "Vodice Municipality", "Vojnik Municipality", "Vransko Municipality", "Vrhnika Municipality", "Vuzenica Municipality", "Zagorje ob Savi Municipality", "Žalec Municipality", "Zavrč Municipality", "Železniki Municipality", "Žetale Municipality", "Žiri Municipality", "Žirovnica Municipality", "Zreče Municipality", "Žužemberk Municipality"], "Solomon Islands": ["Guadalcanal Province", "Isabel Province", "Makira-Ulawa Province", "Malaita Province", "Temotu Province"], "Somalia": ["Bakool", "Banaadir", "Bari", "Bay", "Galguduud", "Gedo", "Hiran", "Lower Juba", "Lower Shebelle", "Middle Juba", "Middle Shebelle", "Mudug", "Nugal", "Sanaag Region", "Togdheer Region"], "South Africa": ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "Northern Cape", "Western Cape"], "South Korea": ["Busan", "Daegu", "Daejeon", "Gangwon Province", "Gwangju", "Gyeonggi Province", "Incheon", "Jeju", "North Chungcheong Province", "North Gyeongsang Province", "North Jeolla Province", "Sejong City", "Seoul", "South Chungcheong Province", "South Gyeongsang Province", "South Jeolla Province", "Ulsan"], "South Sudan": ["Lakes"], "Spain": ["A Coruña", "Albacete", "Alicante", "Almeria", "Araba", "Asturias", "Ávila", "Badajoz", "Barcelona", "Bizkaia", "Burgos", "Caceres", "Cádiz", "Canarias", "Cantabria", "Castellón", "Ciudad Real", "Cuenca", "Gipuzkoa", "Girona", "Guadalajara", "Huelva", "Huesca", "Islas Baleares", "Jaén", "Las Palmas", "Lleida", "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Zamora", "Zaragoza"], "Sri Lanka": ["Colombo District", "Kandy District", "North Central Province", "North Western Province", "Sabaragamuwa Province", "Uva Province"], "Sudan": ["Al Jazirah", "Al Qadarif", "Blue Nile", "Central Darfur", "East Darfur", "Kassala", "Khartoum", "North Darfur", "North Kordofan", "River Nile", "Sennar", "South Darfur", "South Kordofan", "West Darfur", "West Kordofan", "White Nile"], "Suriname": ["Brokopondo District", "Commewijne District", "Coronie District", "Marowijne District", "Nickerie District", "Para District", "Paramaribo District", "Saramacca District", "Wanica District"], "Sweden": ["Blekinge County", "Dalarna County", "Gävleborg County", "Gotland County", "Halland County", "Jönköping County", "Kalmar County", "Kronoberg County", "Norrbotten County", "Örebro County", "Östergötland County", "Skåne County", "Södermanland County", "Stockholm County", "Uppsala County", "Värmland County", "Västerbotten County", "Västernorrland County", "Västmanland County", "Västra Götaland County"], "Switzerland": ["Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Land", "Basel-Stadt", "Bern", "Fribourg", "Geneva", "Glarus", "Graubünden", "Jura", "Lucerne", "Neuchâtel", "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen", "Thurgau", "Ticino", "Uri", "Valais", "Vaud", "Zug", "Zürich"], "Syria": ["Al-Hasakah", "Al-Raqqah", "Aleppo", "As-Suwayda", "Damascus", "Daraa", "Deir ez-Zor", "Hama", "Homs", "Idlib", "Latakia", "Quneitra", "Rif Dimashq", "Tartus"], "Taiwan": ["Changhua", "Chiayi", "Hsinchu", "Hualien", "Kaohsiung", "Kinmen", "Lienchiang", "Miaoli", "Nantou", "Penghu", "Pingtung", "Taichung", "Tainan", "Taipei", "Taitung", "Taoyuan", "Yilan", "Yunlin"], "Tajikistan": ["districts of Republican Subordination", "Gorno-Badakhshan Autonomous Province", "Khatlon Province", "Sughd Province"], "Tanzania": ["Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Tabora", "Tanga", "Zanzibar North", "Zanzibar South", "Zanzibar West"], "Thailand": ["Amnat Charoen", "Ang Thong", "Bangkok", "Bueng Kan", "Buri Ram", "Chachoengsao", "Chai Nat", "Chaiyaphum", "Chanthaburi", "Chiang Mai", "Chiang Rai", "Chon Buri", "Chumphon", "Kalasin", "Kamphaeng Phet", "Kanchanaburi", "Khon Kaen", "Krabi", "Lampang", "Lamphun", "Loei", "Lop Buri", "Mae Hong Son", "Maha Sarakham", "Mukdahan", "Nakhon Nayok", "Nakhon Pathom", "Nakhon Phanom", "Nakhon Ratchasima", "Nakhon Sawan", "Nakhon Si Thammarat", "Nan", "Narathiwat", "Nong Bua Lam Phu", "Nong Khai", "Nonthaburi", "Pathum Thani", "Pattani", "Phangnga", "Phatthalung", "Phayao", "Phetchabun", "Phetchaburi", "Phichit", "Phitsanulok", "Phra Nakhon Si Ayutthaya", "Phrae", "Phuket", "Prachin Buri", "Prachuap Khiri Khan", "Ranong", "Ratchaburi", "Rayong", "Roi Et", "Sa Kaeo", "Sakon Nakhon", "Samut Prakan", "Samut Sakhon", "Samut Songkhram", "Saraburi", "Satun", "Si Sa Ket", "Sing Buri", "Songkhla", "Sukhothai", "Suphan Buri", "Surat Thani", "Surin", "Tak", "Trang", "Trat", "Ubon Ratchathani", "Udon Thani", "Uthai Thani", "Uttaradit", "Yala", "Yasothon"], "Bahamas": ["Bimini", "Cat Island", "Central Abaco", "Crooked Island", "East Grand Bahama", "Exuma", "Freeport", "Harbour Island", "Inagua", "Long Island", "Mayaguana District", "New Providence", "North Abaco", "North Andros", "Ragged Island", "Rum Cay District", "San Salvador Island", "Spanish Wells", "West Grand Bahama"], "Gambia": ["Banjul", "Central River Division", "Lower River Division", "North Bank Division", "Upper River Division", "West Coast Division"], "Timor-Leste": ["Aileu municipality", "Ainaro Municipality", "Baucau Municipality", "Bobonaro Municipality", "Cova Lima Municipality", "Dili municipality", "Ermera District", "Lautém Municipality", "Liquiçá Municipality", "Manatuto District", "Manufahi Municipality", "Viqueque Municipality"], "Togo": ["Centrale Region", "Kara Region", "Maritime", "Plateaux Region", "Savanes Region"], "Tonga": ["Haʻapai", "ʻEua", "Niuas", "Tongatapu", "Vavaʻu"], "Trinidad and Tobago": ["Arima", "Chaguanas", "Couva-Tabaquite-Talparo Regional Corporation", "Diego Martin Regional Corporation", "Eastern Tobago", "Penal-Debe Regional Corporation", "Point Fortin", "Port of Spain", "Princes Town Regional Corporation", "San Fernando", "San Juan-Laventille Regional Corporation", "Sangre Grande Regional Corporation", "Siparia Regional Corporation", "Tunapuna-Piarco Regional Corporation", "Western Tobago"], "Tunisia": ["Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine", "Kebili", "Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"], "Turkey": ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"], "Turkmenistan": ["Ahal Region", "Ashgabat", "Balkan Region", "Daşoguz Region", "Lebap Region", "Mary Region"], "Tuvalu": ["Funafuti", "Nanumanga", "Niutao Island Council", "Nui", "Nukufetau", "Vaitupu"], "Ukraine": ["Autonomous Republic of Crimea", "Cherkaska oblast", "Chernihivska oblast", "Chernivetska oblast", "Dnipropetrovska oblast", "Donetska oblast", "Ivano-Frankivska oblast", "Kharkivska oblast", "Khersonska oblast", "Khmelnytska oblast", "Kirovohradska oblast", "Kyiv", "Kyivska oblast", "Luhanska oblast", "Lvivska oblast", "Mykolaivska oblast", "Odeska oblast", "Poltavska oblast", "Rivnenska oblast", "Sevastopol", "Sumska oblast", "Ternopilska oblast", "Vinnytska oblast", "Volynska oblast", "Zakarpatska Oblast", "Zaporizka oblast", "Zhytomyrska oblast"], "United Arab Emirates": ["Abu Dhabi Emirate", "Ajman Emirate", "Dubai", "Fujairah", "Ras al-Khaimah", "Sharjah Emirate", "Umm al-Quwain"], "United Kingdom": ["England", "Northern Ireland", "Scotland", "Wales"], "United States": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Puerto Rico", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"], "Uruguay": ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"], "Uzbekistan": ["Andijan Region", "Bukhara Region", "Fergana Region", "Jizzakh Region", "Karakalpakstan", "Namangan Region", "Navoiy Region", "Qashqadaryo Region", "Samarqand Region", "Sirdaryo Region", "Surxondaryo Region", "Tashkent", "Tashkent Region", "Xorazm Region"], "Vanuatu": ["Malampa", "Sanma", "Shefa", "Tafea", "Torba"], "Venezuela": ["Anzoátegui", "Apure", "Aragua", "Barinas", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Táchira", "Trujillo", "Yaracuy", "Zulia"], "Vietnam": ["An Giang", "Bà Rịa-Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hồ Chí Minh", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên-Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"], "U.S. Virgin Islands": ["Saint Croix", "Saint John", "Saint Thomas"], "Yemen": ["Adan", "Amran", "Abyan", "Al Bayda'", "Al Hudaydah", "Al Mahrah", "Al Mahwit", "Dhamar", "Hadhramaut", "Hajjah", "Ibb", "Lahij", "Ma'rib", "Raymah", "Saada", "Sana'a", "Shabwah", "Socotra", "Ta'izz"], "Zambia": ["Copperbelt Province", "Luapula Province", "Lusaka Province", "Muchinga Province", "Northwestern Province"], "Zimbabwe": ["Bulawayo Province", "Harare Province", "Manicaland", "Mashonaland Central Province", "Mashonaland East Province", "Mashonaland West Province", "Masvingo Province", "Matabeleland North Province", "Matabeleland South Province", "Midlands Province"], "Martinique": ["Martinique"], "England": ["East Midlands", "East of England", "Greater London", "North East", "North West", "South East", "South West", "West Midlands", "Yorkshire and the Humber"] };

// Expected national-number digit length per country code (min/max), used to validate
// the mobile number field consistently everywhere it appears (Primary/Secondary Guest,
// Travel Agent, Group Guest). Codes not listed fall back to a generic 7–15 digit range
// per the ITU E.164 international numbering plan.
export const PHONE_LENGTH_BY_CODE: Record<string, { min: number; max: number }> = {
  "+91": { min: 10, max: 10 },   // India
  "+1": { min: 10, max: 10 },    // USA/Canada
  "+44": { min: 10, max: 10 },   // UK
  "+971": { min: 9, max: 9 },    // UAE
  "+61": { min: 9, max: 9 },     // Australia
  "+49": { min: 10, max: 11 },   // Germany
  "+33": { min: 9, max: 9 },     // France
  "+81": { min: 10, max: 10 },   // Japan
  "+86": { min: 11, max: 11 },   // China
  "+7": { min: 10, max: 10 },    // Russia
  "+55": { min: 10, max: 11 },   // Brazil
  "+34": { min: 9, max: 9 },     // Spain
  "+39": { min: 9, max: 10 },    // Italy
  "+82": { min: 9, max: 10 },    // South Korea
  "+31": { min: 9, max: 9 },     // Netherlands
  "+41": { min: 9, max: 9 },     // Switzerland
  "+46": { min: 7, max: 9 },     // Sweden
  "+47": { min: 8, max: 8 },     // Norway
  "+45": { min: 8, max: 8 },     // Denmark
  "+358": { min: 6, max: 10 },   // Finland
  "+60": { min: 9, max: 10 },    // Malaysia
  "+65": { min: 8, max: 8 },     // Singapore
  "+66": { min: 9, max: 9 },     // Thailand
  "+852": { min: 8, max: 8 },    // Hong Kong
  "+64": { min: 8, max: 9 },     // New Zealand
  "+27": { min: 9, max: 9 },     // South Africa
  "+20": { min: 10, max: 10 },   // Egypt
  "+234": { min: 10, max: 10 },  // Nigeria
  "+92": { min: 10, max: 10 },   // Pakistan
  "+880": { min: 10, max: 10 },  // Bangladesh
  "+94": { min: 9, max: 9 },     // Sri Lanka
  "+977": { min: 10, max: 10 },  // Nepal
};
const DEFAULT_PHONE_LENGTH = { min: 7, max: 15 };

export function getPhoneLengthRange(countryCode?: string): { min: number; max: number } {
  return (countryCode && PHONE_LENGTH_BY_CODE[countryCode]) || DEFAULT_PHONE_LENGTH;
}

// Validates a mobile number's digit-length against the selected country code.
// Returns an error message string, or "" if valid. Strips spaces/dashes before counting.
export function validatePhoneForCountry(contact: string | undefined, countryCode: string | undefined): string {
  const digits = String(contact || "").replace(/[^\d]/g, "");
  if (!digits) return "Required";
  const { min, max } = getPhoneLengthRange(countryCode);
  if (digits.length < min || digits.length > max) {
    return min === max
      ? `Mobile number must be ${min} digits for the selected country code`
      : `Mobile number must be ${min}-${max} digits for the selected country code`;
  }
  return "";
}

// ─── Input Validation & Sanitization Helpers ────────────────────────────────
// Central validators for guest-facing free-text fields, applied consistently
// across Primary/Secondary Guest, Group Guest, and Child Information forms
// (Create Booking and Edit Booking) to reject XSS/SQLi-style payloads and
// enforce sane length/format limits before data reaches the backend.
// NOTE: These are client-side guards for UX only — the GAS/backend endpoint
// must independently re-validate and parametrize/escape all inputs, since
// client-side checks can always be bypassed.

export const MAX_NAME_LEN = 50;
export const MAX_NATIONALITY_LEN = 50;
export const MIN_NATIONALITY_LEN = 2;
export const MAX_ZIP_LEN = 10;
export const MIN_ZIP_LEN = 3;
export const MAX_ADDRESS_LEN = 250;
export const MAX_CHILD_NAME_LEN = 50;

// Letters, spaces, hyphens, and apostrophes only — covers names like "O'Brien", "Anne-Marie"
const NAME_PATTERN = /^[A-Za-z][A-Za-z '-]*$/;
const NATIONALITY_PATTERN = /^[A-Za-z][A-Za-z ]*$/;
// Alphanumeric with spaces/hyphens — covers most international postcode formats
const ZIP_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;

// Flags common XSS/SQLi payload markers so we reject them outright rather than
// silently mangling input. Checked on every free-text field before the format
// pattern (e.g. name/zip patterns already exclude most of this, but explicit
// detection gives a clearer error message and also covers the Address field,
// which otherwise allows a broad character set).
const UNSAFE_INPUT_PATTERN = /<\s*script|<\s*\/\s*script|on\w+\s*=|javascript\s*:|<\s*iframe|<[^>]+>|['"`;]|--|\/\*|\*\/|\b(select|insert|update|delete|drop\s+table|union|exec|declare)\b/i;

export function containsUnsafeInput(v: any): boolean {
  return UNSAFE_INPUT_PATTERN.test(String(v ?? ""));
}

// Strips HTML tags / javascript: URIs and enforces the max length — used for
// the Home Address field, which needs to allow normal punctuation (commas,
// #, /) but never markup. Call this when persisting the value (on change/blur
// and again before submit) as defense-in-depth alongside validateAddress().
export function sanitizeAddress(v: any): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .slice(0, MAX_ADDRESS_LEN);
}

export function validateNameField(v: any, label = "This field"): string {
  const s = String(v ?? "").trim();
  if (!s) return "Required";
  if (containsUnsafeInput(s)) return `${label} contains invalid characters`;
  if (!NAME_PATTERN.test(s)) return `${label} may only contain letters, spaces, and hyphens`;
  if (s.length > MAX_NAME_LEN) return `${label} must be under ${MAX_NAME_LEN} characters`;
  return "";
}

export function validateNationality(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return ""; // optional field
  if (containsUnsafeInput(s)) return "Nationality contains invalid characters";
  if (!NATIONALITY_PATTERN.test(s)) return "Nationality may only contain letters and spaces";
  if (s.length < MIN_NATIONALITY_LEN) return `Nationality must be at least ${MIN_NATIONALITY_LEN} characters`;
  if (s.length > MAX_NATIONALITY_LEN) return `Nationality must be under ${MAX_NATIONALITY_LEN} characters`;
  return "";
}

export function validateZip(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "Required";
  if (containsUnsafeInput(s)) return "Zip/Postcode contains invalid characters";
  if (!ZIP_PATTERN.test(s)) return "Zip/Postcode may only contain letters, numbers, spaces, and hyphens";
  if (s.length < MIN_ZIP_LEN || s.length > MAX_ZIP_LEN) return `Zip/Postcode must be ${MIN_ZIP_LEN}-${MAX_ZIP_LEN} characters`;
  return "";
}

export function validateAddress(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "Required";
  if (containsUnsafeInput(s)) return "Home Address contains invalid characters";
  if (s.length > MAX_ADDRESS_LEN) return `Home Address must be under ${MAX_ADDRESS_LEN} characters`;
  return "";
}

// Confirms a "YYYY-MM-DD" string (as produced by <input type="date">) is a real
// calendar date — catches values like 2026-02-31 that Date() would otherwise
// silently roll forward into March.
function isRealCalendarDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(iso + "T00:00:00");
  return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
}

function todayISO(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
// Computed once at module load; used both for validation and as the date-input
// min/max attribute so the calendar picker can't even offer an invalid date.
export const TODAY_ISO = todayISO();

export function validateDOB(dob: any): string {
  const s = String(dob ?? "").trim();
  if (!s) return ""; // DOB is optional on this form
  if (!isRealCalendarDate(s)) return "Invalid date of birth";
  if (s > TODAY_ISO) return "Date of birth cannot be in the future";
  return "";
}

export function validateAnniversary(anniversary: any, dob: any): string {
  const a = String(anniversary ?? "").trim();
  if (!a) return ""; // optional
  if (!isRealCalendarDate(a)) return "Invalid anniversary date";
  if (a > TODAY_ISO) return "Anniversary date cannot be in the future";
  const d = String(dob ?? "").trim();
  if (d && isRealCalendarDate(d) && a < d) return "Anniversary date cannot be earlier than Date of Birth";
  return "";
}

export function validateArrivalDate(arrivalDate: any): string {
  const s = String(arrivalDate ?? "").trim();
  if (!s) return "Required";
  if (!isRealCalendarDate(s)) return "Invalid arrival date";
  if (s < TODAY_ISO) return "Arrival date cannot be in the past";
  return "";
}

export function validateChildName(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "Required";
  if (containsUnsafeInput(s)) return "Name contains invalid characters";
  if (!NAME_PATTERN.test(s)) return "Name may only contain letters, spaces, and hyphens";
  if (s.length > MAX_CHILD_NAME_LEN) return `Name must be under ${MAX_CHILD_NAME_LEN} characters`;
  return "";
}

// ─── Additional Info field validators ───────────────────────────────────────
export const MAX_REFERRED_BY_LEN = 100;
export const MAX_HEALTH_INFO_LEN = 500;

// "Referred By" is a free-text name/organization field — same XSS/SQLi guard
// as names, but without the strict alphabetic-only pattern since it may
// contain punctuation like "Dr. Sharma - KIMS Hospital".
export function validateReferredBy(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return ""; // optional
  if (containsUnsafeInput(s)) return "Referred By contains invalid characters";
  if (s.length > MAX_REFERRED_BY_LEN) return `Referred By must be under ${MAX_REFERRED_BY_LEN} characters`;
  return "";
}

// Strips tags/javascript: URIs, same approach as sanitizeAddress but with its
// own max length for the Health Information textarea.
export function sanitizeHealthInformation(v: any): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .slice(0, MAX_HEALTH_INFO_LEN);
}

export function validateHealthInformation(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return ""; // optional
  if (containsUnsafeInput(s)) return "Health Information contains invalid characters";
  if (s.length > MAX_HEALTH_INFO_LEN) return `Health Information must be under ${MAX_HEALTH_INFO_LEN} characters`;
  return "";
}

// Travel Agent "Remarks" textarea — same XSS/SQLi guard + length cap.
export const MAX_AGENT_REMARKS_LEN = 300;

export function sanitizeAgentRemarks(v: any): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .slice(0, MAX_AGENT_REMARKS_LEN);
}

export function validateAgentRemarks(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return ""; // optional
  if (containsUnsafeInput(s)) return "Remarks contains invalid characters";
  if (s.length > MAX_AGENT_REMARKS_LEN) return `Remarks must be under ${MAX_AGENT_REMARKS_LEN} characters`;
  return "";
}

export const MAX_APPROVAL_REMARKS_LEN = 300;

export function sanitizeApprovalRemarks(v: any): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .slice(0, MAX_APPROVAL_REMARKS_LEN);
}

export function validateApprovalRemarks(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return ""; // optional
  if (containsUnsafeInput(s)) return "Approval Remarks contains invalid characters";
  if (s.length > MAX_APPROVAL_REMARKS_LEN) return `Approval Remarks must be under ${MAX_APPROVAL_REMARKS_LEN} characters`;
  return "";
}

// Google Drive file/folder links look like:
//   https://drive.google.com/file/d/<ID>/view
//   https://drive.google.com/drive/folders/<ID>
//   https://drive.google.com/open?id=<ID>
// Real Drive IDs are long (typically 28-44 chars of [A-Za-z0-9_-]); this lets
// us reject short/fake-looking IDs like "invalid123" as well as unrelated
// text or non-Drive URLs, without needing a network call to Drive's API.
const GOOGLE_DRIVE_LINK_PATTERN = /^https:\/\/(drive|docs)\.google\.com\/[a-zA-Z0-9_./?=&%#+-]+$/i;

export function validateGoogleDriveLink(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return ""; // optional field
  if (containsUnsafeInput(s)) return "Link contains invalid characters";
  if (s.length > 500) return "Link is too long";
  if (!GOOGLE_DRIVE_LINK_PATTERN.test(s)) return "Please enter a valid Google Drive file or folder link";
  return "";
}

export const COUNTRY_CODES = [
  { code: "+91", name: "India (+91)" },
  { code: "+1", name: "USA (+1)" },
  { code: "+44", name: "UK (+44)" },
  { code: "+971", name: "UAE (+971)" },
  { code: "+61", name: "Australia (+61)" },
  { code: "+49", name: "Germany (+49)" },
  { code: "+33", name: "France (+33)" },
  { code: "+81", name: "Japan (+81)" },
  { code: "+86", name: "China (+86)" },
  { code: "+7", name: "Russia (+7)" },
  { code: "+55", name: "Brazil (+55)" },
  { code: "+34", name: "Spain (+34)" },
  { code: "+39", name: "Italy (+39)" },
  { code: "+82", name: "South Korea (+82)" },
  { code: "+31", name: "Netherlands (+31)" },
  { code: "+41", name: "Switzerland (+41)" },
  { code: "+46", name: "Sweden (+46)" },
  { code: "+47", name: "Norway (+47)" },
  { code: "+45", name: "Denmark (+45)" },
  { code: "+358", name: "Finland (+358)" },
  { code: "+60", name: "Malaysia (+60)" },
  { code: "+65", name: "Singapore (+65)" },
  { code: "+66", name: "Thailand (+66)" },
  { code: "+852", name: "Hong Kong (+852)" },
  { code: "+64", name: "New Zealand (+64)" },
  { code: "+27", name: "South Africa (+27)" },
  { code: "+20", name: "Egypt (+20)" },
  { code: "+234", name: "Nigeria (+234)" },
  { code: "+92", name: "Pakistan (+92)" },
  { code: "+880", name: "Bangladesh (+880)" },
  { code: "+94", name: "Sri Lanka (+94)" },
  { code: "+977", name: "Nepal (+977)" },
  { code: "+93", name: "Afghanistan (+93)" },
  { code: "+355", name: "Albania (+355)" },
  { code: "+213", name: "Algeria (+213)" },
  { code: "+376", name: "Andorra (+376)" },
  { code: "+244", name: "Angola (+244)" },
  { code: "+1-268", name: "Antigua and Barbuda (+1-268)" },
  { code: "+54", name: "Argentina (+54)" },
  { code: "+374", name: "Armenia (+374)" },
  { code: "+43", name: "Austria (+43)" },
  { code: "+994", name: "Azerbaijan (+994)" },
  { code: "+1-242", name: "Bahamas (+1-242)" },
  { code: "+973", name: "Bahrain (+973)" },
  { code: "+1-246", name: "Barbados (+1-246)" },
  { code: "+375", name: "Belarus (+375)" },
  { code: "+32", name: "Belgium (+32)" },
  { code: "+501", name: "Belize (+501)" },
  { code: "+229", name: "Benin (+229)" },
  { code: "+975", name: "Bhutan (+975)" },
  { code: "+591", name: "Bolivia (+591)" },
  { code: "+387", name: "Bosnia and Herzegovina (+387)" },
  { code: "+267", name: "Botswana (+267)" },
  { code: "+673", name: "Brunei (+673)" },
  { code: "+359", name: "Bulgaria (+359)" },
  { code: "+226", name: "Burkina Faso (+226)" },
  { code: "+257", name: "Burundi (+257)" },
  { code: "+855", name: "Cambodia (+855)" },
  { code: "+237", name: "Cameroon (+237)" },
  { code: "+1", name: "Canada (+1)" },
  { code: "+238", name: "Cape Verde (+238)" },
  { code: "+236", name: "Central African Republic (+236)" },
  { code: "+235", name: "Chad (+235)" },
  { code: "+56", name: "Chile (+56)" },
  { code: "+57", name: "Colombia (+57)" },
  { code: "+269", name: "Comoros (+269)" },
  { code: "+242", name: "Congo (+242)" },
  { code: "+243", name: "DR Congo (+243)" },
  { code: "+506", name: "Costa Rica (+506)" },
  { code: "+385", name: "Croatia (+385)" },
  { code: "+53", name: "Cuba (+53)" },
  { code: "+357", name: "Cyprus (+357)" },
  { code: "+420", name: "Czech Republic (+420)" },
  { code: "+253", name: "Djibouti (+253)" },
  { code: "+1-767", name: "Dominica (+1-767)" },
  { code: "+1-809", name: "Dominican Republic (+1-809)" },
  { code: "+593", name: "Ecuador (+593)" },
  { code: "+503", name: "El Salvador (+503)" },
  { code: "+240", name: "Equatorial Guinea (+240)" },
  { code: "+291", name: "Eritrea (+291)" },
  { code: "+372", name: "Estonia (+372)" },
  { code: "+251", name: "Ethiopia (+251)" },
  { code: "+679", name: "Fiji (+679)" },
  { code: "+241", name: "Gabon (+241)" },
  { code: "+220", name: "Gambia (+220)" },
  { code: "+995", name: "Georgia (+995)" },
  { code: "+233", name: "Ghana (+233)" },
  { code: "+30", name: "Greece (+30)" },
  { code: "+1-473", name: "Grenada (+1-473)" },
  { code: "+502", name: "Guatemala (+502)" },
  { code: "+224", name: "Guinea (+224)" },
  { code: "+245", name: "Guinea-Bissau (+245)" },
  { code: "+592", name: "Guyana (+592)" },
  { code: "+509", name: "Haiti (+509)" },
  { code: "+504", name: "Honduras (+504)" },
  { code: "+36", name: "Hungary (+36)" },
  { code: "+354", name: "Iceland (+354)" },
  { code: "+62", name: "Indonesia (+62)" },
  { code: "+98", name: "Iran (+98)" },
  { code: "+964", name: "Iraq (+964)" },
  { code: "+353", name: "Ireland (+353)" },
  { code: "+972", name: "Israel (+972)" },
  { code: "+225", name: "Ivory Coast (+225)" },
  { code: "+1-876", name: "Jamaica (+1-876)" },
  { code: "+962", name: "Jordan (+962)" },
  { code: "+7", name: "Kazakhstan (+7)" },
  { code: "+254", name: "Kenya (+254)" },
  { code: "+686", name: "Kiribati (+686)" },
  { code: "+965", name: "Kuwait (+965)" },
  { code: "+996", name: "Kyrgyzstan (+996)" },
  { code: "+856", name: "Laos (+856)" },
  { code: "+371", name: "Latvia (+371)" },
  { code: "+961", name: "Lebanon (+961)" },
  { code: "+266", name: "Lesotho (+266)" },
  { code: "+231", name: "Liberia (+231)" },
  { code: "+218", name: "Libya (+218)" },
  { code: "+423", name: "Liechtenstein (+423)" },
  { code: "+370", name: "Lithuania (+370)" },
  { code: "+352", name: "Luxembourg (+352)" },
  { code: "+389", name: "North Macedonia (+389)" },
  { code: "+261", name: "Madagascar (+261)" },
  { code: "+265", name: "Malawi (+265)" },
  { code: "+960", name: "Maldives (+960)" },
  { code: "+223", name: "Mali (+223)" },
  { code: "+356", name: "Malta (+356)" },
  { code: "+692", name: "Marshall Islands (+692)" },
  { code: "+222", name: "Mauritania (+222)" },
  { code: "+230", name: "Mauritius (+230)" },
  { code: "+52", name: "Mexico (+52)" },
  { code: "+691", name: "Micronesia (+691)" },
  { code: "+373", name: "Moldova (+373)" },
  { code: "+377", name: "Monaco (+377)" },
  { code: "+976", name: "Mongolia (+976)" },
  { code: "+382", name: "Montenegro (+382)" },
  { code: "+212", name: "Morocco (+212)" },
  { code: "+258", name: "Mozambique (+258)" },
  { code: "+95", name: "Myanmar (+95)" },
  { code: "+264", name: "Namibia (+264)" },
  { code: "+674", name: "Nauru (+674)" },
  { code: "+505", name: "Nicaragua (+505)" },
  { code: "+227", name: "Niger (+227)" },
  { code: "+850", name: "North Korea (+850)" },
  { code: "+968", name: "Oman (+968)" },
  { code: "+507", name: "Panama (+507)" },
  { code: "+675", name: "Papua New Guinea (+675)" },
  { code: "+595", name: "Paraguay (+595)" },
  { code: "+51", name: "Peru (+51)" },
  { code: "+63", name: "Philippines (+63)" },
  { code: "+48", name: "Poland (+48)" },
  { code: "+351", name: "Portugal (+351)" },
  { code: "+974", name: "Qatar (+974)" },
  { code: "+40", name: "Romania (+40)" },
  { code: "+250", name: "Rwanda (+250)" },
  { code: "+1-869", name: "Saint Kitts and Nevis (+1-869)" },
  { code: "+1-758", name: "Saint Lucia (+1-758)" },
  { code: "+1-784", name: "Saint Vincent (+1-784)" },
  { code: "+685", name: "Samoa (+685)" },
  { code: "+378", name: "San Marino (+378)" },
  { code: "+239", name: "Sao Tome and Principe (+239)" },
  { code: "+966", name: "Saudi Arabia (+966)" },
  { code: "+221", name: "Senegal (+221)" },
  { code: "+381", name: "Serbia (+381)" },
  { code: "+248", name: "Seychelles (+248)" },
  { code: "+232", name: "Sierra Leone (+232)" },
  { code: "+421", name: "Slovakia (+421)" },
  { code: "+386", name: "Slovenia (+386)" },
  { code: "+677", name: "Solomon Islands (+677)" },
  { code: "+252", name: "Somalia (+252)" },
  { code: "+249", name: "Sudan (+249)" },
  { code: "+597", name: "Suriname (+597)" },
  { code: "+963", name: "Syria (+963)" },
  { code: "+886", name: "Taiwan (+886)" },
  { code: "+992", name: "Tajikistan (+992)" },
  { code: "+255", name: "Tanzania (+255)" },
  { code: "+228", name: "Togo (+228)" },
  { code: "+676", name: "Tonga (+676)" },
  { code: "+1-868", name: "Trinidad and Tobago (+1-868)" },
  { code: "+216", name: "Tunisia (+216)" },
  { code: "+90", name: "Turkey (+90)" },
  { code: "+993", name: "Turkmenistan (+993)" },
  { code: "+688", name: "Tuvalu (+688)" },
  { code: "+256", name: "Uganda (+256)" },
  { code: "+380", name: "Ukraine (+380)" },
  { code: "+598", name: "Uruguay (+598)" },
  { code: "+998", name: "Uzbekistan (+998)" },
  { code: "+678", name: "Vanuatu (+678)" },
  { code: "+58", name: "Venezuela (+58)" },
  { code: "+84", name: "Vietnam (+84)" },
  { code: "+967", name: "Yemen (+967)" },
  { code: "+260", name: "Zambia (+260)" },
  { code: "+263", name: "Zimbabwe (+263)" }
];

// Main BookingForm component export split into Part 2 below
export { Field, KInput, KSelect, KTextarea, CardHeader, COUNTRY_CODES, ROOM_MAX_PAX, DATA_API, SUBMIT_API };
export { emptyGuest, emptyGroupGuest, emptyTravelAgent, emptyAdvancePayment, emptyApproval };
export { IND_STEPS, GRP_STEPS };
// Validators/constants above (MAX_NAME_LEN, validateNameField, validateDOB, etc.)
// are already exported inline where declared.
