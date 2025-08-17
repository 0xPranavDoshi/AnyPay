access(all) contract HelloWorld {
    access(all) let greeting: String

    init() {
        self.greeting = "Hello, Flow!"
    }

    access(all) fun getGreeting(): String {
        return self.greeting
    }
}
