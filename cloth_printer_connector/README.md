# Coffee Corner Print Connector

Android companion app for the Coffee Corner billing web app. It registers the
`technoduo-print://` scheme, pairs securely with the billing backend, loads a
single-use print job, and prints an 80 mm ESC/POS receipt over Bluetooth Classic
SPP.

## Build

Run `gradlew.bat assembleRelease` from this directory. The current release build
is signed with the Android debug key for direct/internal installation.

## Phone setup

1. Pair the printer in Android Bluetooth settings.
2. Open the connector, select `BTprinter090187`, and run Test Print.
3. In Coffee Corner Billing choose Print Bridge mode and 80 mm paper.
4. Tap Connect Bridge App once.
5. Generate a bill; the connector prints it and returns to billing.
