# Build portability

This is an incomplete native Alpha. Read agent-handoff/README.md and MIGRATION.md.
Build with JDK 17+, Android SDK 35 / Build Tools 35.0.0: ./gradlew :app:assembleDebug
Configure ANDROID_HOME or local.properties. Phone-only absolute AAPT2 override was removed from this copy.
ARM64 builders must provide compatible AAPT2 via -Pandroid.aapt2FromMavenOverride=/absolute/path/to/aapt2.
SDK, caches, credentials, private runtime logs and APK are not included. Other machines have not been tested.
Latest local build: SUCCESSFUL in 51s. Install: Success. Android smoke: PASS 8 checks.
Root branch is not asserted. Latest cold start and long-running service validation remain pending.
Handoff statements about pending GitHub push describe the snapshot before this commit.
