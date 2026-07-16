import { beforeYouTravelCards } from './travel/beforeYouTravelCards.js';
import { airportFlightsCards } from './travel/airportFlightsCards.js';
import { accommodationCheckInCards } from './travel/accommodationCheckInCards.js';
import { transportTicketsCards } from './travel/transportTicketsCards.js';
import { directionsNavigationCards } from './travel/directionsNavigationCards.js';
import { restaurantsCafesCards } from './travel/restaurantsCafesCards.js';
import { shoppingPaymentsCards } from './travel/shoppingPaymentsCards.js';
import { sightseeingActivitiesCards } from './travel/sightseeingActivitiesCards.js';
import { problemsComplaintsCards } from './travel/problemsComplaintsCards.js';
import { healthSafetyEmergenciesCards } from './travel/healthSafetyEmergenciesCards.js';

export const travelExpressionCards = [
  ...beforeYouTravelCards,
  ...airportFlightsCards,
  ...accommodationCheckInCards,
  ...transportTicketsCards,
  ...directionsNavigationCards,
  ...restaurantsCafesCards,
  ...shoppingPaymentsCards,
  ...sightseeingActivitiesCards,
  ...problemsComplaintsCards,
  ...healthSafetyEmergenciesCards,
];
