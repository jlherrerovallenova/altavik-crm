import { PushNotifications, type Token, type ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initPushNotifications = async () => {
  if (Capacitor.getPlatform() === 'web') {
    console.log('Push Notifications are not available on the web in this setup.');
    return;
  }

  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android will just grant without prompting
  const result = await PushNotifications.requestPermissions();
  if (result.receive === 'granted') {
    // Register with Apple / Google to receive push via APNS/FCM
    PushNotifications.register();
  } else {
    // Show some error
    console.error('Push notification permission denied');
  }

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration',
    (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      // Here you would typically send the token to your backend (e.g. Supabase)
      // to associate it with the current logged-in user.
    }
  );

  // Some issue with our setup and push will not work
  PushNotifications.addListener('registrationError',
    (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    }
  );

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived',
    (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      // Optionally trigger local state update or custom toast here
    }
  );

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed',
    (notification: ActionPerformed) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // Handle deep linking or specific routing here
    }
  );
};
