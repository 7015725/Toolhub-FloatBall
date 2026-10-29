plugins { id("com.android.application") }

android {
    namespace = "com.toolhub.floatball"
    compileSdk = 35
    buildToolsVersion = "35.0.0"
    defaultConfig {
        applicationId = "com.toolhub.floatball"
        minSdk = 34
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-alpha"
    }
    // Preserve the original Kotlin template for reference, but do not ship its greeting screen.
    sourceSets {
        getByName("main").java.setSrcDirs(listOf("src/main/native"))
        getByName("test").java.setSrcDirs(listOf("src/test/native"))
        getByName("androidTest").java.setSrcDirs(listOf("src/androidTest/native"))
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release { isMinifyEnabled = false }
    }
    lint { abortOnError = true }
}
