import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    AsyncStorage.getItem(key).then((stored) => {
      if (stored) setValue(JSON.parse(stored));
    });
  }, [key]);

  const setAndPersist = async (newValue: T) => {
    setValue(newValue);
    await AsyncStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setAndPersist] as const;
};
