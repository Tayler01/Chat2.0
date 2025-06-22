/*
  # Remove push notification subscriptions table

  1. Drop table
    - `subscriptions` if it exists

  The application no longer uses push notifications, so the table and related
  policies are removed.
*/

DROP TABLE IF EXISTS subscriptions CASCADE;
