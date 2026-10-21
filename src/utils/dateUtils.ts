export function formatRelativeTimeSpanish(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace un momento';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} min`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? 'hace 1 hora' : `hace ${diffInHours} horas`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'ayer';
  }
  if (diffInDays < 7) {
    return `hace ${diffInDays} días`;
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function getCurrentDateFormattedSpanish(): string {
  const now = new Date();
  const dayName = now.toLocaleDateString('es-ES', { weekday: 'long' });
  const dayNumber = now.getDate();
  const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
  
  // Capitalize first letter of day and month
  const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  
  return `${capDay}, ${dayNumber} de ${capMonth}`;
}

export function getGreetingSpanish(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    return '¡Buenos días!';
  } else if (hour >= 12 && hour < 20) {
    return '¡Buenas tardes!';
  } else {
    return '¡Buenas noches!';
  }
}
