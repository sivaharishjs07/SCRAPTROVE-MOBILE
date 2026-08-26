// Location data matching the Scrap Trove web app exactly
export const LOC = {
  "Tamil Nadu": {
    "Chennai":    ["Anna Nagar","Adyar","T. Nagar","Velachery","Tambaram","Porur","Ambattur","Chromepet","Mogappair"],
    "Coimbatore": ["RS Puram","Gandhipuram","Peelamedu","Ukkadam"],
    "Madurai":    ["Anna Nagar","Bypass Road","Palanganatham","K K Nagar"],
    "Salem":      ["Fairlands","Suramangalam","Omalur","Attur"],
    "Trichy":     ["Srirangam","Woraiyur","Thillai Nagar","Cantonment"],
  },
  "Kerala": {
    "Kochi":              ["Ernakulam","Fort Kochi","Edappally","Kakkanad","Aluva"],
    "Thiruvananthapuram": ["Kowdiar","Pattom","Kazhakkoottam","Nemon"],
    "Kozhikode":          ["Nadakkavu","Mavoor"],
  },
  "Karnataka": {
    "Bengaluru": ["Koramangala","Indiranagar","Whitefield","Jayanagar","HSR Layout","BTM Layout"],
    "Mysuru":    ["Saraswathipuram","Gokulam","Kuvempunagar"],
    "Mangaluru": ["Kadri","Surathkal"],
  },
  "Maharashtra": {
    "Mumbai": ["Andheri","Bandra","Dadar","Borivali","Juhu","Powai"],
    "Pune":   ["Kothrud","Wakad","Hinjawadi","Viman Nagar","Baner"],
    "Nagpur": ["Sadar","Sitabuldi"],
  },
  "Delhi": {
    "New Delhi": ["Connaught Place","Saket","Vasant Kunj","Dwarka","Hauz Khas","Karol Bagh"],
  },
  "Andhra Pradesh": {
    "Visakhapatnam": ["MVP Colony","Gajuwaka","Madhurawada"],
    "Vijayawada":    ["Benz Circle","Patamata"],
  },
};

export const STATES    = Object.keys(LOC);
export const districts = (state)           => state ? Object.keys(LOC[state] || {}) : [];
export const cities    = (state, district) => (state && district) ? (LOC[state]?.[district] || []) : [];
