# Quantum Apocalypse? Demystifying the Doomsday of Encryption

Quantum computers are rapidly transitioning from science fiction to reality, and the concern that they may soon be capable of breaking a significant portion of today's cryptographic algorithms is growing. In response to this threat, [NIST finalized the standardization of three post-quantum secure algorithms in August 2024](<](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards)>). However, due to its cutting-edge nature, the discourse surrounding quantum computing is often fraught with buzzwords, myths and fearmongering. In this blog post, I will equip you with the tools to develop your own intuition and technical understanding of these topics, enabling you to make up your own mind.

This post accompanies my session at [BaselOne](https://baselone.org/) from 2024-10-17. You can find the PDF of my slides here:

[![Click here to view the Slides as PDF](img/slides-thumbnail.webp)](https://media.githubusercontent.com/media/pascscha/weblog/refs/heads/main/dynamic/weblog/4-quantum-apocalypse/assets/Pascal-Schaerli_Quantum-Apocalypse.pdf)

## Why we care today

Quantum computers and post-quantum cryptographic algorithms are a hot topic at the moment. In August of this year, NIST (the National Institute of Standards and Technology of the United States) [released their first 3 finalized post-quantum secure cryptographic algorithms](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards), after many years of designing and testing them. NIST's suggestions and standards [often become industry best practices](https://www.nist.gov/blogs/cybersecurity-insights/cornerstone-cybersecurity-cryptographic-standards-and-50-year-evolution), extending beyond the US.

In this chapter, we'll explore the urgency of addressing quantum computing threats to cryptography. We'll discuss the slow adoption of new algorithms and the concept of "store now, decrypt later" attacks, and we'll examine which cryptographic algorithms are most affected by quantum attacks. But first, let's start by estimating when we can expect the first quantum computers capable of breaking our current cryptography.

### Expiration date

Whenever new breakthroughs in quantum computing are achieved, many tech news articles tend to pop up, claiming that the post-quantum age has begun or engaging in other [fearmongering](https://thequantuminsider.com/2024/10/11/chinese-scientists-report-using-quantum-computer-to-hack-military-grade-encryption/). One recent example is a wave of misinformed tech news articles that appeared a couple of days before the release of this article, following a [Chinese research paper](http://cjc.ict.ac.cn/online/onlinepaper/wc-202458160402.pdf). While the paper itself (written mostly in Chinese) presents cool research, demonstrating the factorization of 55-bit integers, this is not a threat to modern cryptography, which typically would required the factorization of 2048 or more bit numbers to break anything. Despite numerous [misinformed articles](https://www.scmp.com/news/china/science/article/3282051/chinese-scientists-hack-military-grade-encryption-quantum-computer-paper) severely overstating the findings from this paper, the quantum apocalypse is not here yet. I hope this blog post can give you enough understanding to [debunk](https://www.forbes.com/sites/craigsmith/2024/10/16/department-of-anti-hype-no-china-hasnt-broken-military-encryption-with-quantum-computers/) such news yourself, as this kind of misinformation ultimately hurts our field's credibility.

The Global Risk Institute surveyed approximately 30 experts about when they believe quantum computers will first be able to break the [RSA encryption scheme](<https://en.wikipedia.org/wiki/RSA_(cryptosystem)>) in a reasonable amount of time [(see report here)](https://globalriskinstitute.org/mp-files/quantum-threat-timeline-report-2023.pdf#page=19). While their answers vary widely, most surveyed experts think that in 20 years, there's a 50% or higher chance that quantum computers will be able to break RSA with 2048-bit keys within 24 hours. Some even believe it could happen much earlier. Even if 20 years seems far off, migrating to new standards takes considerable time, so it might be more pressing than you think, as we'll see in the next section.

### Adoption is slow

We are very slow at adopting new algorithms and protocols. You might recognize some names on the diagram below yourself and might be surprised how old they are:

![Popular cryptographic algorithms or protocols and when they were established](assets/slides/time-flies.webp)

The [Diffie-Hellman key exchange](https://ee.stanford.edu/%7Ehellman/publications/24.pdf), which you'll read about a lot in this post, is almost 50 years old, as is the [RSA encryption algorithm](https://dl.acm.org/doi/abs/10.1145/359340.359342). Also, the [SHA-1](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf) hash function, a cornerstone of [Git versioning](https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection.html#_short_sha_1), is almost 30 years old. Seeing how widely we still use these 30+ year-old algorithms makes the 20-year estimate sound like little time, as maturing these algorithms and adopting them takes such a long time that we need to start early, even more so since it's not enough to have our quantum-resistant algorithms implemented by the time the first quantum computers are implemented, due to the attack shown in the next section.

### Store now, decrypt later

There is an attack on cryptographic systems that affects our communication even before quantum computers reach sufficient size. It is fittingly named ["Store now, decrypt later."](https://www.techmonitor.ai/hardware/quantum/harvest-now-decrypt-later-cyberattack-quantum-computer?cf-view)

![Eve can intercept and store encrypted communication now, and break the encryption later, once quantum computers are capable enough.](assets/slides/store-now-decrypt-later.webp)

Let's say Alice and Bob want to deliver a secret Message. Eve, a malicious third party, intercepts and copies the message while it's being transmitted. Eve can't read the message right now because it's encrypted. However, suppose Eve holds onto that message and waits until quantum computers are advanced enough to break the encryption. Once that time has come, Eve can use a quantum computer to help decrypt the message sent years ago. If that message still has value after that time, Alice and Bob will be in big trouble. However, not all cryptographic algorithms are equally vulnerable to being broken by quantum computers, as we will explore in the next section.

### What's affected

Quantum computers pose varying levels of threat to different cryptographic algorithms. Let's look at the vulnerabilities of different algorithms' families. The cryptographic landscape comprises numerous algorithms (often denoted by three-letter acronyms, making it challenging to keep track of them). These algorithms are based on different primitives, and most are unaffected by quantum computers. Here's a simplified overview of the kinds of cryptographic algorithms that exist:

![Simplified view of cryptographic algorithms landscape. Only Asymmetric Algorithms are significantly impacted by quantum computers.](assets/slides/whats-affected.webp)

It's important to note that the shield icon doesn't necessarily indicate complete security. For instance, MD5 is listed but has [many known vulnerabilities](https://link.springer.com/content/pdf/10.1007/11799313_17.pdf) on conventional computers. The shield shows that quantum computers will only slightly weaken these algorithms, not compromise them entirely.

One quantum attack that affects even the "shielded" algorithms is [Grover's algorithm](https://dl.acm.org/doi/pdf/10.1145/237814.237866). This algorithm can find the input that produces a specific output from any given black box function, allowing it to break symmetric encryption or find hash collisions faster than conventional computers. However, Grover's algorithm's impact is less severe than other quantum attacks. By doubling the key size or hash length, we can maintain the same security level against Grover's algorithm as we have today. For example:

- AES-256 would provide equivalent security to today's AES-128
- SHA-512 would provide equivalent security to today's SHA-256

Asymmetric algorithms, such as the RSA encryption scheme, Diffie-Hellman (DH) key exchanges, or Digital Signature Algorithms (DSA), are much more vulnerable to quantum attacks. These algorithms rely on the difficulty of computing discrete logarithms or factorization. While these problems are indeed challenging for conventional computers, [Peter Shor discovered a method](<https://greencompute.uk/References/QuantumComputing/Shor%20(1994)%20-%20algorithms%20for%20QC,%20discrete%20logarithms%20and%20factoring.pdf>) to solve these problems more efficiently using quantum computers. This is why quantum computers significantly affect asymmetric cryptographic algorithms more than symmetric or unkeyed ones.

Why even use asymmetric algorithms if we already have quantum secure symmetric encryption? One reason lies in key distribution. Symmetric algorithms require all parties to have a shared key, which presents a logistical challenge. Unless you're willing to physically meet your peers and exchange the shared key in person, you need an asymmetric algorithm like the Diffie-Hellman key exchange to establish a shared secret remotely over insecure channels.

## Diffie-Hellman - an asymmetric algorithm example

While an in-depth introduction to cryptography would be beyond the scope of this blog post, we'll explore how the [Diffie-Hellman key exchange](https://ee.stanford.edu/%7Ehellman/publications/24.pdf) works as an example of an asymmetric algorithm. It serves as a cornerstone of modern internet security and allows two parties to establish a shared secret key over an insecure channel. This protocol forms the basis for secure communication protocols like [TLS](https://de.wikipedia.org/wiki/Transport_Layer_Security) and protects nearly all sensitive online transactions and communications today.

We'll start by learning how the Diffie-Hellman key exchange works through a color analogy to gain an intuition of its concept, then explore its mathematical implementation. This will help us understand why such algorithms are vulnerable to quantum attacks.

### Color analogy

There's an intuitive analogy for the Diffie-Hellman key exchange for establishing a secret color between two parties. Let's consider Alice in the red sweater and Bob in the yellow T-shirt. They want to establish a secret - in this case, a secret color. However, all of their communication is (passively) intercepted by the eavesdropper Eve:

![Alice and Bob establish a secret color, while an evesdropper cannot come up with the same mixture.](assets/slides/diffie-hellman-with-colors.webp)

All parties, including Eve, start with some public parameters - in this case, everyone has the color <b style="color:#12aaee">blue</b>. Additionally, Alice has her secret favorite color, <b style="color:#c00000">red</b>, and Bob has his secret color, <b style="color:#e1c10c">yellow</b>.

Alice masks her secret by mixing her <b style="color:#c00000">red</b> with the public <b style="color:#12aaee">blue</b>, resulting in a <b style="color:#c61efc">purple</b> color that she sends to Bob. Bob does the same, mixing his <b style="color:#e1c10c">yellow</b> with <b style="color:#12aaee">blue</b>, and sends the resulting <b style="color:#00b050">green</b> mixture to Alice. Meanwhile, Eve notes all the communication and keeps a copy of the <b style="color:#c61efc">purple</b> and <b style="color:#00b050">green</b> mixtures.

Alice can now mix the <b style="color:#00b050">green</b> she received from Bob with her secret <b style="color:#c00000">red</b> color, obtaining a probably quite unappealing <b style="color:#b9651d">brown</b> consisting of one part <b style="color:#12aaee">blue</b>, one part <b style="color:#c00000">red</b>, and one part <b style="color:#e1c10c">yellow</b>. Similarly, when Bob mixes Alice's <b style="color:#c61efc">purple</b> with his secret <b style="color:#e1c10c">yellow</b>, he ends up with exactly the same shade of <b style="color:#b9651d">brown</b> as Alice.

However, Eve cannot replicate this process. Mixing <b style="color:#c61efc">purple</b> and <b style="color:#00b050">green</b> together will result in a mixture with too much <b style="color:#12aaee">blue</b>. Even knowing that the <b style="color:#c61efc">purple</b> is just <b style="color:#12aaee">blue</b> mixed with some secret color, it's impossible to un-mix the colors once they are combined. Thus, Eve cannot obtain the same secret color mixture as Alice and Bob.

This analogy has strong parallels to the calculations of the real algorithm. Instead of a secret shade of <b style="color:#b9651d">brown</b>, Alice and Bob derive a secret number over an insecure channel. Let's find out how to translate the algorithm in the next section.

### Now with numbers

There's a mathematical equivalent to our color mixing analogy. Instead of starting with a public <b style="color:#12aaee">blue</b> color, all parties start with two public numbers: a base number <b style="color:#12aaee">$${\textbf\color{#12aaee}g}$$</b> and a prime number <b>$$p$$</b>. Throughout this example, all calculations will be performed [modulo](https://en.wikipedia.org/wiki/Modulo) <b>$$\textbf\color{#12aaee}p$$</b> (written as $$\mod {\textbf\color{#12aaee}p}$$). This modulo operation keeps the numbers within what mathematicians call a ["finite field" or "Galois field"](https://en.wikipedia.org/wiki/Finite_field). You can safely ignore the $$\mod {\textbf\color{#12aaee}p}$$ parts; their relevance will become clear later.

![Alice and Bob establish a secret number, while an evesdropper cannot come up with the same number.](assets/slides/diffie-hellman.webp)

Alice's secret is no longer her favorite <b style="color:#c00000">red</b> color, but rather her secret number <b style="color:#c00000">$${\textbf\color{#c00000}a}$$</b>. To "mix" this with the public base <b style="color:#12aaee">$${\textbf\color{#12aaee}g}$$</b>, she calculates $${\textbf\color{#c61efc}A} = {\textbf\color{#12aaee}g}^{\textbf\color{#c00000}a} \mod {\textbf\color{#12aaee}p}$$ and sends this $$\textbf\color{#c61efc}A$$ to Bob, with Eve dutifully taking notes. Similarly, Bob calculates $${\textbf\color{#00b050}B} = {\textbf\color{#12aaee}g}^{\textbf\color{#e1c10c}b} \mod {\textbf\color{#12aaee}p}$$ and sends the result to Alice while Eve continues her surveillance and keeps a copy of $${\textbf\color{#00b050}B}$$ for herself.

Alice then mixes her secret number with the value she received from Bob and computes the shared secret $${\textbf\color{#b9651d}S} = {\textbf\color{#00b050}B}^{\textbf\color{#c00000}a} \mod {\textbf\color{#12aaee}p}$$. Bob does the same thing on his end, mixing his secret number with the value received from Alice, obtaining the shared secret $${\textbf\color{#b9651d}S} = {\textbf\color{#c61efc}A}^{\textbf\color{#e1c10c}b} \mod {\textbf\color{#12aaee}p}$$. They both end up with the same shared secret number $$\textbf\color{#b9651d}S$$, because [despite the modular reduction](https://en.wikipedia.org/wiki/Modular_arithmetic#Basic_properties), the equations can be rewritten as follows:

- Alice: $${\textbf\color{#b9651d}S} = {\textbf\color{#00b050}B}^{\textbf\color{#c00000}a} \mod {\textbf\color{#12aaee}p} = ({\textbf\color{#12aaee}g}^{\textbf\color{#e1c10c}b} \mod {\textbf\color{#12aaee}p})^{\textbf\color{#c00000}a} \mod {\textbf\color{#12aaee}p} = {\textbf\color{#12aaee}g}^{{\textbf\color{#e1c10c}b} \cdot {\textbf\color{#c00000}a}} \mod {\textbf\color{#12aaee}p} = {\textbf\color{#12aaee}g}^{{\textbf\color{#c00000}a} \cdot {\textbf\color{#e1c10c}b}} \mod {\textbf\color{#12aaee}p}$$
- Bob: $$~{\textbf\color{#b9651d}S} = {\textbf\color{#c61efc}A}^{\textbf\color{#e1c10c}b} \mod {\textbf\color{#12aaee}p} = ({\textbf\color{#12aaee}g}^{\textbf\color{#c00000}a} \mod {\textbf\color{#12aaee}p})^{\textbf\color{#e1c10c}b} \mod {\textbf\color{#12aaee}p} = {\textbf\color{#12aaee}g}^{{\textbf\color{#c00000}a} \cdot {\textbf\color{#e1c10c}b}} \mod {\textbf\color{#12aaee}p}$$

Just as Eve couldn't unmix the colors in our previous analogy, she faces a similar challenge here. Even though she knows $$\textbf\color{#c61efc}A$$ (which is $${\textbf\color{#12aaee}g}^{\textbf\color{#c00000}a}\mod {\textbf\color{#12aaee}p}$$) and $$\textbf\color{#00b050}B$$ (which is $${\textbf\color{#12aaee}g}^{\textbf\color{#e1c10c}b} \mod {\textbf\color{#12aaee}p}$$), she can't determine Alice's secret $$\textbf\color{#c00000}a$$ or Bob's secret $$\textbf\color{#e1c10c}b$$ and similarly she cannot learn the secret number $${\textbf\color{#b9651d}S}$$. You might think she could use logarithms to figure it out, and you would be correct if it weren't for the $$\mod {\textbf\color{#12aaee}p}$$ modular reduction we've been diligently applying throughout. This modular arithmetic makes it difficult to compute logarithms - a challenge known as the ["discrete logarithm problem"](https://www.sciencedirect.com/science/article/pii/S0885064X04000056?via%3Dihub). My intuition for this is that logarithms work by measuring the "order of magnitude" of a number. However, this order of magnitude is lost whenever we perform our reductions by $$\mod {\textbf\color{#12aaee}p}$$, which is what makes the problem so hard with conventional computers. However, with quantum computers, we can use one of Shor's algorithms to compute it, as we will learn in the next two chapters.

## Quantum computers

This chapter will demystify quantum computers by exploring their unique properties and limitations. Using an example problem, we will demonstrate how they differ from conventional computers, highlighting where they excel and where they are limited. A common misconception is that quantum computations can perform all the calculations that today's computers do just a lot faster. This isn't entirely accurate, and quantum computers also have their own limitations.

### Counting dice

Let's examine the toy problem of finding all possibilities of how two six-sided dice can be added together, determining the probability of each possible sum. With a conventional computer, we could use a brute-force approach, iterating through all possible combinations one by one:

![All possible ways to add two six-sided dice together form a pyramid, which shows the probability distribution of the result.](assets/slides/classical-dice.webp)

This results in a distribution that might be familiar if you've previously played [Catan](https://en.wikipedia.org/wiki/Catan). The sum of 7 has the most possible combinations, making it the most likely outcome. At the same time, higher or lower numbers become progressively less likely. However, to get to this result, we had to process all 36 possible input combinations to arrive at this solution, at least following such a naive brute-force approach. Now imagine using two 1000-sided dice - without optimizations, the algorithm would need to work through a million combinations to generate such a distribution. How could this be optimized using a quantum computer?

### Quantum dice

Unlike the conventional computers' brute-force algorithm, quantum computers offer a much more efficient solution. Let's look at a grotesquely simplified version of this quantum computation. Instead of a regular 6-sided dice that shows only one number at a time, we imagine a quantum dice:

![Two quantum dice added together.](assets/slides/quantum-addition.webp)

Such a quantum dice exists in a superposition of all possible numbers from one to six simultaneously. While classical dice show precisely one number, quantum dice simultaneously hold all six possible values at once. When we add two such quantum dice, the result is a quantum superposition of all possible results (represented as a colorful swirl in the diagram). Instead of performing 36 separate calculations, we only have to do one addition to obtain a quantum state containing the information about all possible dice combinations.

However, there's a significant limitation. While this quantum state contains all the information we want, we cannot access it directly. When we want to read a value from a quantum superposition, we can "measure" its state. However, measuring a quantum superposition ["collapses" it to a single classical value randomly](https://blog.cambridgecoaching.com/blog/bid/313718/Physics-Tutor-Quantum-Strangeness-Superposition-and-Measurement). For example, measuring our quantum state might give us "6" one time, "7" another time, and "10" the next. If we measure many times, we'll get results that approach the same probability distribution as our classical dice pyramid.

In this instance, despite being so close to having the actual solution, quantum computers serve no benefit over classical computers. We can only leverage their power with intelligent algorithms circumventing this measurement-induced data loss, such as Shor's Algorithms, which we'll explore in the next chapter. This is why quantum computers are only sometimes faster for some problems and why not all cryptography is doomed yet.

## Shor's algorithms

In this chapter, we'll explore [Shor's algorithms](<https://greencompute.uk/References/QuantumComputing/Shor (1994) - algorithms for QC, discrete logarithms and factoring.pdf>), which are designed to solve discrete logarithm and factorization problems on quantum computers. We'll start by solving the problem using a brute-force approach on a conventional computer, then show how we can obtain the solution using a Fourier transform. Next, we'll translate this process to quantum computers, where you'll be rewarded for reading so far into my blog post by the beauty of quantum Fourier transforms. These transforms are the key that allows Shor's algorithms to obtain meaningful results despite the collapse of information when measuring quantum superposition states.

While we've previously discussed the discrete logarithm problem in the context of Diffie-Hellman, this chapter will focus on a related problem, which is part of Shor's factorization algorithm. This version is easier to understand, while the core principles remain the same. Consider the equation $$g^x \mod N = 1$$. Given $$g$$ and $$N$$, which is usually a very big number, our goal is to find $$x$$. You might suggest $$x = 0$$ as a solution, and you'd be correct - it's a trivial solution that works for any $$N$$. However, it's much more interesting to find the smallest non-zero $$x$$ that satisfies this equation.

### Brute-force approach

Let's start understanding the problem through a brute-force approach that could be performed on a conventional computer today. Using N = 51 as an example, we can iterate through possible values for $$x$$:

![Trying out different values for x when N = 51.](assets/slides/factorization-subproblem-bruteforce.webp)

We can see that the smallest non-zero solution is $$x = 8$$. Interestingly, suppose we continue increasing $$x$$ from that point onwards. In that case, we notice that the results from the first column repeat themselves until at $$x = 16$$, we return to a result of $$1$$ again.

![Plot of the formula, showing the smallest non-zero value for x that gives the result 1 is also the period of that signal.](assets/slides/factorization-subproblem-period-plot.webp)

Plotting these results reveals a repeating signal with a period of 8, which matches our smallest non-zero solution. One way of finding frequencies and periods of signals is the [Fourier transform](https://www.youtube.com/watch?v=spUNpyF58BY), which we will discover in the next section.

### Fourier transforms

On this small detour, I will provide an intuitive explanation of the capabilities of Fourier transforms. It is a powerful mathematical tool for analyzing periodic signals, as used, for example, in your phone antenna, but also for visualizing music:

![Music visualization using Fourier transform to show frequencies. Music made with Suno AI.](https://youtu.be/JW95v59YR4g)

I personally know these visualizations from the electronic music label [Monstercat](https://www.youtube.com/watch?v=rEL-HdWvLpM), which I used to listen to a lot. The result is quite intuitive: at the top, you can see the voice frequencies going up and down, while at the bottom, lower frequencies from the drums bounce with the beat.

We can apply the same method to our periodic signal from the factorization problem. By interpreting our signal as a sound wave, we can visualize its frequency components:

![Signal for N = 51 interpreted as Sound, and Fourier transform applied to it.](https://youtu.be/bEu9Jl7QNmY)

While it might not sound as pleasant as music, the spectrum shows one frequency dominating. The inverse of this frequency is equal to the period of the signal.

Here's another example with a smaller period, resulting in a higher frequency note:

![Signal for N = 15 interpreted as sound. It sounds higher than before because the period is smaller.](https://youtu.be/29RTVQfwG9A)

This method works well even when the signals are not perfectly clean and repeat in a more complex way:

![Signal for N = 25, which despite the messy rugged edges sounds deeper than the previous notes.](https://youtu.be/c3B499ghX8o)

Despite the rougher edges, our ears can still distinguish that it's a lower note than the previous one. The Fourier transform confirms this, showing a dominant frequency corresponding to a period of 20.

Lastly, here's an even messier signal with an even lower fundamental frequency:

![Signal for N = 69, with the largest period so far, therefore it sounds the deepest.](https://youtu.be/xU2HMhUr6Aw)

Regardless of the signal's complexity, both our ears and the Fourier transform can discern the underlying frequency, which in this case corresponds to a period of 22.

The Fourier transform does not help when solving the problem on conventional computers. After all, if we have already brute-forced all the values needed to obtain the signal that we would pass to the Fourier transform, we already know where the signal's value is $$1$$ for the first time. But for quantum computers, that's a different story, as we'll see in the next section.

### Quantum Fourier transform

With quantum computers, we do not need to brute-force a large number of $$x$$ individually anymore. Instead, we can create a quantum superposition of many possible $$x$$ and apply the function to that. The resulting superposition of this calculation will hold the entire periodic plot from before within a single state. However, we face the same issue as with the quantum dice. If we were to measure this state directly, the information would collapse, and we would get a meaningless random sample of some possible value. This is where we can use a [quantum Fourier transform](https://arxiv.org/pdf/quant-ph/0201067) to circumvent this issue:

![Switching x out with a superposition of many possible values, allows us to get the result with the help of a quantum Fourier transform.](assets/slides/factorization-subproblem-quantum.webp)

When applying the quantum Fourier transform to this superposition, we do not need to perform any measurements yet, as the operation is directly performed on the superposition. Only after that do we measure the result of the Fourier transform, which will likely result in the most prominent frequency of the signal, from which we get the period and the solution for $$x$$ that we are looking for. Instead of performing the calculation on many different values of $$x$$, we just had to do the calculation once, apply a quantum Fourier transform, and obtain the correct solution with high probability. Since verifying the solution is easy, if we find that we got the wrong one, we can repeat the process until we get the right one.

With this understanding of how Shor's algorithm works, let's see how it could be applied to break the Diffie-Hellman key exchange we discussed earlier.

### Breaking Diffie-Hellman

In the context of Diffie-Hellman key exchange, here's how a quantum attack might unfold:

![Using Shor's Algorithm with the help of Quantum Fourier transforms, Eve will be able to break the discrete log problem and recover S.](assets/slides/shors-algorithm-diffie-hellman.webp)

1. Alice and Bob exchange their public values as usual.
2. Eve, the eavesdropper, intercepts and stores the public values $$\textbf\color{#c61efc}A$$ and $$\textbf\color{#00b050}B$$.
3. Once sufficiently powerful quantum computers become available, Eve can launch her attack.
4. Eve creates a quantum superposition of all possible values for Alice's private key $$\textbf\color{#c00000}a$$
5. Using Shor's other algorithm, which is similar to the one we discussed in the previous section and also uses quantum Fourier transforms, Eve can find Alice's private key $$\textbf\color{#c00000}a$$ and use that to efficiently compute the shared secret $$\textbf\color{#b9651d}S$$.

### What algorithms are affected

Diffie-Hellman is not the only algorithm affected by Shor's algorithms. Shor's algorithms can break algorithms that rely on [discrete logarithms](https://www.cs.umd.edu/~amchilds/teaching/w08/l02.pdf), such as Diffie-Hellman or DSA, and those based on factoring, like RSA. Furthermore, in 2003, [John Proos and Christof Zalka](https://arxiv.org/pdf/quant-ph/0301141) extended the discrete logarithm quantum algorithm to [work on elliptic curves](https://www.cs.umd.edu/~amchilds/teaching/w08/l03.pdf), which means it can also break elliptic curve-based cryptography like ECDH or ECDSA.

On the other hand, as already mentioned above, symmetric algorithms and hash functions are not affected as much. Hence, all of our well-established cryptographic algorithms for asymmetric encryption depend on mathematical problems that can be solved efficiently by quantum computers. These vulnerabilities show the need for new cryptographic primitives, such as lattice-based cryptography, which I'll explain in the next chapter.

## Lattice-based cryptography

One of the promising approaches to post-quantum secure cryptography is based on a mathematical structure called lattices. They are replacing the modular arithmetic from before, and problems like the shortest vector problem replace the discrete logarithm as the foundation for security. In this chapter, we'll explore what a lattice is and then look at the closest vector problem, which forms the basis for some of NIST's new quantum-resistant algorithms.

![Two-dimensional lattice, spanned by the "good" green and blue basis vectors, as well as the "bad" red and yellow basis vectors.](assets/slides/lattice-basis.webp)

A lattice is created by starting with two vectors, shown in green and blue on the diagram. The lattice consists of all points that can be reached by any integer combination of these vectors, resulting in a regular pattern of points. Interestingly, the green and blue vectors are not the only ones that can span this lattice. We can also find less intuitive vectors that span the same lattice, such as the red and yellow vectors in the diagram. While these "bad" basis vectors are less straightforward than the green and blue ones, they can still reach the same points.

![It's straightforward to reach a point using the "good" green and blue basis vectors, but requires many more steps with the "bad" red and yellow basis.](assets/slides/lattice-basis-2.webp)

For example, let's say we want to reach the purple point. With the "good" basis vectors, we move one blue vector to the right and one green vector down. However, many more steps are involved with the "bad" basis vectors, and it's not immediately obvious which combination would lead to that point. This difference in complexity can be used to build new cryptographic primitives, as seen in the next section.

### Closest vector problem

In this problem, we are given a point that does not exactly lie on any of the lattice points. The goal is to find the lattice point closest to it. This is called the "closest vector problem" and is used by some of the new quantum-secure NIST algorithms.

![Given a point that is not on the lattice, what lattice point is the closest?](assets/slides/lattice-closest-vector-1.webp)

Knowing the green and blue vectors makes this task relatively easy - you can perform a coordinate transformation and quickly find the path. However, with the yellow and red vectors, the problem becomes much more challenging:

![Blue and green vectors reach the closest point in a straightforward path, but with the "bad" red and yellow basis vectors, it is not as easy.](assets/slides/lattice-closest-vector-2.webp)

It's important to note that the greyed-out lattice points are not known to anyone. All you have are either the "good" green and blue basis vectors or the "bad" red and yellow basis. If you only have the ugly vectors, it's tough to determine how to combine them to get as close as possible to the given target. Even when you find a solution, you can't be sure there isn't a different lattice point that would be even closer.

The security of some new algorithms proposed by NIST is based on solving this problem with much larger vectors and in many more dimensions than the two shown in these diagrams. The "good" blue and green basis vectors can be regarded as the private key of a party, while the "bad" red and yellow basis vectors can be used as a public key. While we don't have a guarantee that no quantum algorithm solves this problem efficiently, [we have yet to find any such algorithms so far](https://blog.simons.berkeley.edu/2020/05/fine-grained-hardness-of-lattice-problems-open-questions/). Therefore, it can be used as a quantum-resistant cryptographic algorithm.

## Way forward

This final chapter will discuss practical steps for moving toward quantum-resistant cryptography. We'll look at the algorithms standardized by NIST, discuss the challenges of adopting new algorithms, explore the concept of hybrid mode implementation, and provide a suggested migration plan.

As mentioned earlier, NIST has released three algorithms:

1. [**ML-KEM**](https://csrc.nist.gov/pubs/fips/203/final) (Formerly known as Crystals-Kyber): **M**odule-**L**attice-Based **K**ey **E**ncapsulation **M**echanism, which can substitute Diffie-Hellman key exchanges or public key encryption like RSA.

2. [**ML-DSA**](https://csrc.nist.gov/pubs/fips/204/final) (Formerly known as Crystals-Dilithium): **M**odule-**L**attice-Based **D**igital **S**ignature **A**lgorithm, which can substitute DSA or ECDSA.

3. [**SLH-DSA**](https://csrc.nist.gov/pubs/fips/205/final) (Formerly known as Sphincs+): **S**tate**L**ess **H**ash-Based **D**igital **S**ignature **A**lgorithm, which can substitute DSA or ECDSA and does not rely on lattices.

### Missing maturity

Should you immediately replace all Diffie-Hellman key exchanges with ML-KEM? Not so fast. In April, a [pre-print](https://eprint.iacr.org/2024/555) claimed to have found an attack on lattice-based cryptography using quantum computers. Fortunately, a mistake in the algorithm was discovered, so we're still secure.

In June 2024, a team of researchers led by Daniel J. Bernstein published a paper detailing two significant timing vulnerabilities in Kyber (ML-KEM)implementations, which they named [KyberSlash1 and KyberSlash2](https://kyberslash.cr.yp.to/). These vulnerabilities affected several implementations, including the official reference code for Kyber. The researchers reliably recovered Kyber secret keys within minutes for KyberSlash2 and a few hours for KyberSlash1. These vulnerabilities were found in the implementations, not the underlying algorithm itself. After responsible disclosure, the maintainers of various affected libraries have already patched the issues. However, this incident shows that the new algorithms have not reached the maturity we are accustomed to from existing algorithms.

Besides these issues, there has also been criticism about the general practices of NIST and their ties to the NSA.

### Criticism towards NIST

While we've focused on lattice-based cryptography, it's worth noting that there are other approaches to post-quantum cryptography. These include [hash-based](https://en.wikipedia.org/wiki/Hash-based_cryptography), [code-based](https://arxiv.org/pdf/1907.12754), and [multivariate](https://en.wikipedia.org/wiki/Multivariate_cryptography) cryptographic systems. However, this diversity is not yet reflected in NIST's releases. While there are two different primitives for digital signatures, only a lattice-based key encapsulation mechanism has been finalized so far. This is somewhat concerning because if someone finds a way to solve the closest vector problem with quantum computers, NIST has not yet finalized any alternative key encapsulation mechanism.

NIST has also faced significant criticism, notably from cryptographer Daniel J. Bernstein, regarding the lack of transparency during the standardization process of these post-quantum algorithms. Bernstein filed a [lawsuit](https://foiaproject.org/case_detail/?title=on&style=foia&case_id=36313) against NIST, which is still ongoing. His blog also highlights [errors in some of NIST's analyses](https://blog.cr.yp.to/20231023-clumping.html) and [criticizes](https://blog.cr.yp.to/20240102-hybrid.html) NIST's advice against using the new algorithms in hybrid mode.

Personally, I share many of these criticisms. However, the fact that these algorithms are being standardized by NIST means that they will be adopted widely, which turns more eyes on them, leading to faster discovery and resolution of weaknesses. Being a relatively young field, I feel it is especially important to adopt mainstream solutions. Nevertheless, I strongly believe in using these new algorithms in hybrid mode, as demonstrated in the next section.

### Hybrid mode

The [Signal Messenger](https://signal.org) (which I highly recommend using) has been using ML-KEM (Kyber) as part of its key exchange protocol [since the autumn of 2023.](https://signal.org/blog/pqxdh/). Although Signal was affected by Bernstein's KyberSlash timing attack, the protocol was never vulnerable because it was used in hybrid mode.

![Hybrid key exchange with both classical and quantum secure algorithms.](assets/slides/hybrid-mode.webp)

In hybrid mode, both a standard Diffie-Hellman key exchange and a post-quantum secure key exchange are performed. A key derivation function then combines both secrets to produce a single secret that depends on both the classical and the post-quantum secure algorithm. For an attacker to access this key, they would need to break both the classic Diffie-Hellman key exchange (which is battle-tested and less likely to have severe bugs) and the new quantum-secure algorithm (which might still have some bugs but is likely secure against quantum computers). This is a simplification of the actual key exchange performed in the Signal protocol, which is well explained in their [specifications](https://signal.org/docs/specifications/pqxdh/).

In my non-rigorous tests, ML-KEM (specifically its [Python bindings of liboqs](https://github.com/open-quantum-safe/liboqs-python)) was more or less the same speed as Elliptic Curve Diffie-Hellman (ECDH). Both are significantly faster than classic Diffie-Hellman. This means that even in hybrid mode, which combines both ECDH and ML-KEM, performance remains competitive with current standards. However, it's worth noting that while computational performance is strong, the hybrid mode will result in larger handshake sizes due to the additional data being exchanged.

Now that we know the problems and ways of solving them, what are the next steps we should take towards quantum secure cryptography?

### Migration plan

How should we plan our migration? While we don't know precisely when quantum computers will reach a scale that can break today's cryptographic algorithms, the likelihood increases over time. As a consumer, there is nothing much to do but wait for adoption by the authors of the software we are using. However, if you are writing your own software that employs cryptographic algorithms, here is how I suggest you master the quantum threat:

![Migration timeline](assets/slides/migration-timeline.webp)

1. We have already had quantum secure symmetric algorithms for a while. We might want to [double the key size](https://arxiv.org/pdf/2004.10686) to counter [Grover's algorithm](https://dl.acm.org/doi/pdf/10.1145/237814.237866), for example, by using AES with 256-bit keys instead of 128-bit keys. These algorithms are already widely adopted, and we should continue using them.

2. Regarding asymmetric algorithms, we should first migrate key exchange and encryption algorithms like DH or RSA to ML-KEM in hybrid mode. Start using these algorithms in your implementations as soon as possible, considering that software written today will likely be used for many years and the need to protect against "store now, decrypt later" attacks. There are already some libraries that allow for such a migration, such as [liboqs](https://openquantumsafe.org/liboqs/wrappers), a C implementation of post-quantum algorithms with wrappers in popular languages like Java, .NET, and Python. Implement algorithms using a hybrid approach, and involve expert help throughout the migration.

3. Digital signature algorithms are less urgent to migrate since "store now, decrypt later" doesn't apply. However, they are often harder to migrate due to the many participants in these protocols, so it is still advisable to have them ready when quantum computers hit the streets. So if you come across the chance to employ post-quantum secure signatures without big issues in backwards compatibility, you should take this chance. Like before, implement algorithms using a hybrid approach, and involve expert help throughout the migration.

### General tips on cryptography

Working with cryptography, whether post-quantum secure or conventional, is a delicate operation with many potential pitfalls. Here are some general tips for doing it securely:

1. **Don't rely on security through obscurity**: It might be tempting to come up with a super complicated cryptographic algorithm or protocol yourself. After all, if it's so complex that even you barely understand how it all comes together, how could an attacker navigate it? However, such approaches often have glaring holes, and there might be significant shortcuts that compromise the overall security.

2. **Secure algorithms don't guarantee a secure protocol**: The use of state-of-the-art algorithms says nothing about the security of your overall protocol. I cringe at marketing materials trying to convey that their application is secure just because ["military-grade"](https://pascscha.ch/weblog/3-breaking-military-grade-encryption/) AES-256 is being used somewhere within. Don't take comfort in false security; it's not only about what algorithms are used but also how they are used (as shown in my previous post, [Finding 19 Vulnerabilities in One Secure Messenger](https://pascscha.ch/weblog/2-sharekey-cryptography-review/)).

3. **Use existing protocols**: The main trick is to do as little as possible yourself. No matter how well-versed you are in cryptography, nothing beats widely adopted protocols that have stood the test of time and been used and reviewed by many people. Whenever possible, use existing protocols and build your application around them.

4. **Consult with experts**: Always have your ideas challenged and reviewed by experts in the field. When writing or migrating any kind of cryptographic application, you should perform an initial assessment, have someone on-call during implementation to address questions that arise during development, and finally conduct a review of the finished product. While you might already have such talent in-house, involving external help with specific knowledge in these topics can be beneficial. [ELCASecurity](https://www.elcasecurity.ch/en/contact), the company I work for, can provide such expert assistance and can offer valuable help in any of these steps.

## Conclusions

I want to leave you with the four main takeaways I want you to leave this post with:

1. **Quantum Computers are not magically fast at everything**: While they can do an incredible number of parallel computations, the result of that will be some quantum superposition, and unless you have a specific trick such as the quantum Fourier transform used in Shor's algorithms, you cannot leverage this parallel computation.

2. **Mostly asymmetric cryptographic algorithms are affected**: So far we have only found such good tricks for the asymmetric cryptographic algorithms we use today, meaning that symmetric cryptography like AES, ChaCha20, or hash functions can continue to be used, only requiring to [double the key sizes](https://arxiv.org/pdf/2004.10686) to retain the security of today.

3. **Migrate now**: Given the threat of "store now, decrypt later" attacks and software's long lifecycles, consider migrating your asymmetric encryption schemes now.

4. **Use hybrid mode**: The new quantum-resistant algorithms lack the maturity of current standards. For now, use them in hybrid mode to balance security and reliability.
