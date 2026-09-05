plugins {
    id("com.android.application")
}

android {
    // MainActivity remains in the existing Java package; applicationId keeps
    // this new connector installable alongside the old connector.
    namespace = "com.technoduo.coffeeprint"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.clothshop.printerconnector"
        minSdk = 23
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
