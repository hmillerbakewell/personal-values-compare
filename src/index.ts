class ComparisonPoset {
    orderings: Map<string, Comparison> = new Map()
    constructor(readonly humanValues: string[]) {
        this.humanValues.map(v1 => {
            this.humanValues.map(v2 => {
                this.orderings.set(combine_values(v1, v2), Comparison.Unknown)
            })
        })
    }
    comparison(v1: string, v2: string): Comparison {
        return this.orderings.get(combine_values(v1, v2)) as Comparison
    }
    all_above(v1: string): string[] {
        return this.humanValues.filter(v2 => this.comparison(v2, v1) == Comparison.GreaterThan)
    }
    all_below(v1: string): string[] {
        return this.humanValues.filter(v2 => this.comparison(v1, v2) == Comparison.GreaterThan)
    }
    add_greater_than(higher: string, lower: string): ComparisonPoset {
        let higher_and_above = [higher].concat(this.all_above(higher))
        let lower_and_below = [lower].concat(this.all_below(lower))
        higher_and_above.map(v1 => {
            lower_and_below.map(v2 => {
                this._set(v1, v2, Comparison.GreaterThan)
            })
        })
        return this
    }
    _set(v1: string, v2: string, comparison: Comparison) {
        if (v1 == v2) {
            throw new Error("Values must be different")
        }
        let current = this.comparison(v1, v2)
        if (current != Comparison.Unknown && current != comparison) {
            throw new Error("Comparison disagreement")
        }
        this.orderings.set(combine_values(v1, v2), comparison)
        this.orderings.set(combine_values(v2, v1), flip_comparison(comparison))
    }
    print_valid(): string[] {
        return print_assignation(assign_ordering(this))
    }

    _max_rating(value: string): number {
        // 0-indexed, 0 means definitely at the top
        // rating of n means there are n definitely above this
        return this.humanValues.filter(v2 => this.comparison(v2, value) == Comparison.GreaterThan).length
    }

    ratings(max: number): RatingInformation[] {

        let qualifying = this.humanValues.filter(v => this._max_rating(v) < max)

        return qualifying.map(v => new RatingInformation(
            v,
            this._max_rating(v),
            qualifying.filter(w => this.comparison(v, w) == Comparison.Unknown && (v != w))
        ))
    }
}

class RatingInformation {
    constructor(readonly value: string, readonly rating: number, readonly unknown_comparisons: string[]) { }
}

function assign_ordering(poset: ComparisonPoset): Map<string, number> {
    let assignation = new Map<string, number>()
    poset.humanValues.map(value => assignation.set(value, Math.random()))
    let missmatch = function (): Boolean {
        // Need to check that if a > b in the poset then a > b in the assignation
        for (let value of poset.humanValues) {
            let below = poset.all_below(value)
            let biggest_below = Math.max(...below.map(v => assignation.get(v) as Comparison))
            if (assignation.get(value) as Comparison <= biggest_below) {
                return true
            }
        }
        return false
    }
    let counter = 0
    let max = 100
    while (missmatch() && counter < max) {
        for (let value of poset.humanValues) {
            let below = poset.all_below(value)
            let biggest_below = Math.max(...below.map(v => assignation.get(v) as number))
            if (assignation.get(value) as number <= biggest_below) {
                assignation.set(value, biggest_below + (1 - biggest_below) * Math.random())
            }
        }
        counter++
    }
    if (counter == max) {
        throw new Error("Timeout")
    }
    return assignation
}

function print_assignation(assignation: Map<string, number>): string[] {
    let values = [...assignation.keys()].sort((a, b) => (assignation.get(a) as number) - (assignation.get(b) as number))
    return values
}

function combine_values(v1: string, v2: string): string {
    return v1 + "::" + v2
}

enum Comparison {
    GreaterThan = 1, LessThanOrEqual = -1, Unknown = 0
}

function flip_comparison(comparison: Comparison): Comparison {
    switch (comparison) {
        case Comparison.GreaterThan:
            return Comparison.LessThanOrEqual
        case Comparison.LessThanOrEqual:
            return Comparison.GreaterThan
        case Comparison.Unknown:
            return Comparison.Unknown
    }
}


let Definitions = {
    "Adventure": "Finding new excitements",
    "Independence": "Living without routine assistance",
    "Appearance": "Beauty, presence, and fashion",
    "Boldness": "Doing what few dare to do",
    "Compassion": "Easing the pains of strangers",
    "Challenge": "Pushing yourself, regardless of the goal",
    "Community": "Being part of a wider group",
    "Competency": "Building skills in a particular field",
    "Visual Arts and Crafts": "Creating or admiring",
    "Curiosity": "Finding new ideas",
    "Determination": "Finishing what you start",
    "Faith": "Connection to something beyond humanity",
    "Fame": "Being known to all",
    "Friendships": "Deep relationships with a select few",
    "Influence": "Power over others",
    "Justice": "Righting the wrongs you see",
    "Kindness": "Supporting the needs of others",
    "Leadership": "People turning to you for guidance",
    "Learning": "Amassing knowledge and skills",
    "Love": "Finding people to share your heart with",
    "Performing Arts": "Attending or performing",
    "Work": "Fulfilling employment",
    "Peace": "Peace within yourself",
    "Pleasure": "Treating yourself well",
    "Popularity": "Being liked, but not perhaps known, by a large group",
    "Religion": "The routine and structure, as opposed to Faith",
    "Reputation": "The things strangers know you for",
    "Responsibility": "Being trusted by others",
    "Stability": "Confidence that next week will be like this week",
    "Sports": "Attending or playing",
    "Keeping Fit": "Exercise for the sake of health",
    "Quiet Hobbies": "Occupied moments of calm",
}

let Values: string[] = []
for (let key in Definitions) {
    Values.push(key)
}

class ValuesGame {
    poset: ComparisonPoset
    constructor(readonly max_interest: number) {
        this.poset = new ComparisonPoset(Values)
    }
    of_interest(): [boolean, string[]] {
        let rating_info = this.poset.ratings(this.max_interest)
        let valid_competition = rating_info.filter(ri => ri.unknown_comparisons.length > 0)
        if (valid_competition.length == 0) {
            return [false, []]
        }

        let first_choice = rFrom(valid_competition.map(v => [v, 1 / (1 + v.rating)]))
        let second_choice = rFrom(first_choice.unknown_comparisons.map(v => [v, 1 / (1 + this.poset._max_rating(v))]))
        return [true, [first_choice.value, second_choice]]
    }
    choose(v1: string, v2: string): void {
        this.poset.add_greater_than(v1, v2)
        this.suggest()
    }
    suggest(): void {
        clear_choice_div()
        let pair = this.of_interest()
        if (pair[0] != false) {
            draw_choice(pair[1][0], pair[1][1])
        } else {
            draw_assignment(this.poset.print_valid().reverse().slice(0, this.max_interest))
        }
    }
}

function clear_choice_div() {
    let div = document.getElementById("comparisons")
    div!.innerHTML = ""
}

function draw_assignment(values: string[]) {
    let div = document.getElementById("assignment")
    div!.innerHTML = `<div class='header'>Your top values, ranked</div>` + values.map(v => `<div class='valueReport'><p>${v}</p><p>${(Definitions as any)[v]}</p></div>`).join("\n")
}

function rFrom<T>(weighted: [T, number][]): T {
    let total = (weighted.map(v => v[1])).reduce((a, b) => a + b)
    let r = Math.random() * total
    while (r > 0) {
        let popped = weighted.pop() as [T, number]
        r -= popped[1]
        if (r < 0) {
            return popped[0]
        }
    }
    // Should never reach here
    throw new Error("Weighted list was empty")
}

function draw_choice(v1: string, v2: string) {
    let div = document.getElementById("comparisons")
    function button(v: string, w: string): HTMLElement {
        let b = document.createElement("button")
        b.innerText = v
        b.addEventListener("click", ev => {
            VG.choose(v, w)
        })
        return b
    }

    function mini_label(v: string): HTMLElement {
        let d = document.createElement("div")
        d.innerText = (Definitions as any)[v]
        d.classList.add("definition")
        return d
    }
    let label = document.createElement("div")
    label.classList.add("header")
    label.classList.add("two-wide")
    label.innerHTML = "Which is more important to you?"
    clear_choice_div()
    div!.appendChild(label)
    div!.appendChild(button(v1, v2))
    div!.appendChild(button(v2, v1))
    div!.appendChild(mini_label(v1))
    div!.appendChild(mini_label(v2))
}

let VG = new ValuesGame(2)
function start() {
    VG.suggest()
}