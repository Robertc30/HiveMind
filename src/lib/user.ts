import { nanoid } from 'nanoid';
import { supabase } from './supabase';
import { isValidUUID } from '../types';

const DEVICE_ID_KEY = 'device_id';

export async function getOrCreateUser() {
  try {
    // Get or create device ID
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = nanoid();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('username')
      .eq('device_id', deviceId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingUser) {
      return existingUser.username;
    }

    // Generate random username
    const adjectives = ["Swift", "Loud", "Silent", "Witty", "Clever", "Bright", "Wise", "Quick"];
    const animals = ["Tiger", "Falcon", "Panther", "Otter", "Wolf", "Eagle", "Bear", "Fox"];
    const username = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}`;

    // Create new user with UUID
    const userId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        device_id: deviceId,
        username
      });

    if (insertError) {
      console.error('Error creating user:', insertError);
      throw insertError;
    }

    return username;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
}