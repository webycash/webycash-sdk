plugins {
    kotlin("jvm") version "1.9.24"
    `maven-publish`
    signing
}

group = "cash.weby"
version = "0.1.1"

repositories { mavenCentral() }

dependencies {
    implementation("net.java.dev.jna:jna:5.14.0")
}

java {
    withSourcesJar()
    withJavadocJar()
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            artifactId = "webycash-sdk"
            from(components["java"])
            pom {
                name.set("webycash-sdk")
                description.set("Webcash cross-platform SDK — Kotlin/JVM bindings")
                url.set("https://github.com/webycash/webycash-sdk")
                licenses { license { name.set("MIT"); url.set("https://opensource.org/licenses/MIT") } }
                developers { developer { id.set("webycash"); name.set("Webycash Developers") } }
                scm { url.set("https://github.com/webycash/webycash-sdk") }
            }
        }
    }
    repositories {
        maven {
            name = "OSSRH"
            url = uri("https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/")
            credentials {
                username = System.getenv("MAVEN_USERNAME")
                password = System.getenv("MAVEN_PASSWORD")
            }
        }
    }
}

signing {
    useInMemoryPgpKeys(System.getenv("GPG_PRIVATE_KEY"), System.getenv("GPG_PASSPHRASE"))
    sign(publishing.publications["maven"])
}
