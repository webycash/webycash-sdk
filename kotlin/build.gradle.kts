plugins {
    kotlin("jvm") version "1.9.24"
    id("com.vanniktech.maven.publish") version "0.30.0"
}

group = "cash.weby"
version = "0.2.16"

repositories { mavenCentral() }

dependencies {
    implementation("net.java.dev.jna:jna:5.14.0")
    testImplementation(kotlin("test-junit5"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    // Gradle 9+ / JUnit Platform: launcher must be on test runtime classpath
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.10.2")
}

tasks.test {
    useJUnitPlatform()
}

mavenPublishing {
    coordinates("cash.weby", "webycash-sdk", version.toString())
    publishToMavenCentral(com.vanniktech.maven.publish.SonatypeHost.CENTRAL_PORTAL, automaticRelease = true)
    signAllPublications()

    pom {
        name.set("webycash-sdk")
        description.set("Webcash cross-platform SDK — Kotlin/JVM bindings")
        url.set("https://github.com/webycash/webycash-sdk")
        licenses {
            license {
                name.set("MIT")
                url.set("https://opensource.org/licenses/MIT")
            }
        }
        developers {
            developer {
                id.set("webycash")
                name.set("Webycash Developers")
            }
        }
        scm {
            url.set("https://github.com/webycash/webycash-sdk")
            connection.set("scm:git:git://github.com/webycash/webycash-sdk.git")
            developerConnection.set("scm:git:ssh://git@github.com/webycash/webycash-sdk.git")
        }
    }
}
