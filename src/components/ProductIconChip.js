/**
 * ProductIconChip — React Native icon chip for scrap products.
 * Each type maps to a physically recognisable MaterialCommunityIcon.
 */
import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RULES = [
  // ── Steel Utensils (must come before 'steel') ─────────────────────────────
  { k: ['utensil'],                              icon: 'silverware-fork-knife',   color: '#6B7280', bg: '#F3F4F6' }, // fork + knife = instantly clear

  // ── Metals ────────────────────────────────────────────────────────────────
  { k: ['iron'],                                 icon: 'hammer',                  color: '#374151', bg: '#F3F4F6' }, // hammer = iron rod / metal work
  { k: ['steel'],                                icon: 'cog',                     color: '#6B7280', bg: '#F3F4F6' }, // gear = steel machinery/parts
  { k: ['copper', 'wire'],                       icon: 'lightning-bolt',          color: '#D97706', bg: '#FEF3C7' }, // bolt = copper wire / electricity
  { k: ['brass'],                                icon: 'key-variant',             color: '#B45309', bg: '#FFF7ED' }, // key = brass
  { k: ['alumin'],                               icon: 'layers-triple',           color: '#3B82F6', bg: '#DBEAFE' }, // layers = aluminium sheets

  // ── Paper ─────────────────────────────────────────────────────────────────
  { k: ['newspaper', 'book'],                    icon: 'newspaper',               color: '#6B7280', bg: '#F3F4F6' },
  { k: ['paper', 'cardboard'],                   icon: 'package-variant-closed',  color: '#D97706', bg: '#FEF3C7' }, // cardboard box

  // ── Plastic ───────────────────────────────────────────────────────────────
  { k: ['bottle', 'pet'],                        icon: 'bottle-soda',             color: '#06B6D4', bg: '#CFFAFE' }, // soda bottle = PET bottle ✓
  { k: ['plastic', 'hdpe'],                      icon: 'bucket',                  color: '#8B5CF6', bg: '#EDE9FE' }, // bucket = hard plastic ✓

  // ── Electronics ───────────────────────────────────────────────────────────
  { k: ['mobile', 'phone'],                      icon: 'cellphone',               color: '#3B82F6', bg: '#DBEAFE' },
  { k: ['laptop', 'computer', 'pc'],             icon: 'laptop',                  color: '#4B5563', bg: '#F3F4F6' },
  { k: ['tv', 'television', 'monitor'],          icon: 'television',              color: '#7C3AED', bg: '#EDE9FE' },
  { k: ['electronic', 'ewaste'],                 icon: 'chip',                    color: '#7C3AED', bg: '#EDE9FE' },

  // ── Appliances ────────────────────────────────────────────────────────────
  { k: ['washing'],                              icon: 'washing-machine',         color: '#0EA5E9', bg: '#E0F2FE' },
  { k: ['fridge', 'refrigerator'],               icon: 'fridge',                  color: '#0EA5E9', bg: '#E0F2FE' },
  { k: ['ac', 'air cond', 'air con'],            icon: 'snowflake',               color: '#0EA5E9', bg: '#E0F2FE' }, // snowflake = AC/cooling

  // ── Batteries & Tyres ─────────────────────────────────────────────────────
  { k: ['battery', 'batter'],                    icon: 'car-battery',             color: '#EF4444', bg: '#FEE2E2' },
  { k: ['tyre', 'tire', 'wheel'],                icon: 'car-tire-alert',          color: '#374151', bg: '#F3F4F6' },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { k: ['mixed', 'other', 'misc'],               icon: 'recycle',                 color: '#16A34A', bg: '#DCFCE7' },
];

function getConfig(name = '', cat = '') {
  const s = (name + ' ' + (cat || '')).toLowerCase();
  for (const r of RULES) {
    if (r.k.some(k => s.includes(k))) return r;
  }
  return { icon: 'recycle', color: '#16A34A', bg: '#DCFCE7' };
}

export default function ProductIconChip({ name = '', cat = '', size = 22, chipSize = 44, style: extra }) {
  const { icon, color, bg } = getConfig(name, cat);
  return (
    <View style={[{
      width: chipSize, height: chipSize,
      borderRadius: Math.round(chipSize * 0.28),
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }, extra]}>
      <MaterialCommunityIcons name={icon} size={size} color={color} />
    </View>
  );
}
