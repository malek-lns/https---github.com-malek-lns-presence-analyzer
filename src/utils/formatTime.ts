// utils/formatTime.ts
export const formatTime = (time: string | null | undefined): string => {
  // Cas vide
  if (!time) {
    return '00:00';
  }

  try {
    // Si déjà au format HH:mm
    if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
      return time;
    }

    // Si au format HH:mm mais avec des espaces
    if (typeof time === 'string' && time.includes(':')) {
      const [hours, minutes] = time.trim().split(':').map(Number);
      return `${Math.floor(hours).toString().padStart(2, '0')}:${Math.floor(minutes).toString().padStart(2, '0')}`;
    }

    // Conversion depuis les secondes vers HH:mm
    const totalSeconds = Math.floor(Number(time));
    if (isNaN(totalSeconds)) {
      return '00:00';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch {
    return '00:00';
  }
};