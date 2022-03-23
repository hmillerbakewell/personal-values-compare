"use strict";
class ComparisonPoset {
    constructor(humanValues, orderings = new Map()) {
        this.humanValues = humanValues;
        this.orderings = new Map();
        this.orderings = copy_map(orderings);
        if ([...orderings.values()].length == 0) {
            this.humanValues.map(v1 => {
                this.humanValues.map(v2 => {
                    this.orderings.set(combine_values(v1, v2), Comparison.Unknown);
                });
            });
        }
    }
    comparison(v1, v2) {
        return this.orderings.get(combine_values(v1, v2));
    }
    all_above(v1) {
        return this.humanValues.filter(v2 => this.comparison(v2, v1) == Comparison.GreaterThan);
    }
    all_below(v1) {
        return this.humanValues.filter(v2 => this.comparison(v1, v2) == Comparison.GreaterThan);
    }
    add_greater_than(higher, lower) {
        let higher_and_above = [higher].concat(this.all_above(higher));
        let lower_and_below = [lower].concat(this.all_below(lower));
        let o = copy_map(this.orderings);
        higher_and_above.map(v1 => {
            lower_and_below.map(v2 => {
                o.set(combine_values(v1, v2), Comparison.GreaterThan);
                o.set(combine_values(v2, v1), Comparison.LessThanOrEqual);
            });
        });
        return new ComparisonPoset(this.humanValues, o);
    }
    supremum(value) {
        let above = this.all_above(value);
        if (above.length > 0) {
            return this.supremum(above[0]);
        }
        return value;
    }
    print_valid() {
        return print_assignation(assign_ordering(this));
    }
    num_components() {
        return this.suprema().length;
    }
    suprema() {
        return [...new Set(this.humanValues.map(v => this.supremum(v)))];
    }
    estimate_questions_remaining(determine_top_n) {
        // strategy: accurate measure for the top level
        // then a heuristic for the rest
        let completed = this.fully_determined();
        let next_level = this.maximal_top_n(completed + 1).length - completed;
        // How many questions to connect all components, then fully determine top n
        let questions_to_link_components = next_level - 1;
        // Now work out how many questions once we have linked all components
        // Most likely scenario is binary tree
        let remaining = Math.max(determine_top_n - completed, 1);
        let questions_to_fill_top_spots_typical = remaining * (remaining - 1) / 2;
        let estimate = questions_to_link_components + 1.5 * questions_to_fill_top_spots_typical;
        return Math.floor(estimate) + 3; // plus 3 to be on the safe side
    }
    is_determined(value) {
        // Fully determined values have comparisons known everywhere, except against themselves
        return this.humanValues.filter(v2 => this.comparison(value, v2) == Comparison.Unknown).length == 1;
    }
    fully_determined() {
        // Number with no unknown entries (beside themselves)
        return this.humanValues.filter(v => this.is_determined(v)).length;
    }
    maximal_top_n(n) {
        return this.humanValues.filter(v => this.all_above(v).length < n);
    }
    _max_rating(value) {
        // 0-indexed, 0 means definitely at the top
        // rating of n means there are n definitely above this
        return this.humanValues.filter(v2 => this.comparison(v2, value) == Comparison.GreaterThan).length;
    }
    ratings(max) {
        let qualifying = this.humanValues.filter(v => this._max_rating(v) < max);
        return qualifying.map(v => new RatingInformation(v, this._max_rating(v), qualifying.filter(w => this.comparison(v, w) == Comparison.Unknown && (v != w))));
    }
}
function copy_map(ordering) {
    let o = new Map();
    [...ordering.keys()].map(k => {
        o.set(k, ordering.get(k));
    });
    return o;
}
class RatingInformation {
    constructor(value, rating, unknown_comparisons) {
        this.value = value;
        this.rating = rating;
        this.unknown_comparisons = unknown_comparisons;
    }
}
function assign_ordering(poset) {
    let assignation = new Map();
    poset.humanValues.map(value => assignation.set(value, Math.random()));
    let missmatch = function () {
        // Need to check that if a > b in the poset then a > b in the assignation
        for (let value of poset.humanValues) {
            let below = poset.all_below(value);
            let biggest_below = Math.max(...below.map(v => assignation.get(v)));
            if (assignation.get(value) <= biggest_below) {
                return true;
            }
        }
        return false;
    };
    let counter = 0;
    let max = 100;
    while (missmatch() && counter < max) {
        for (let value of poset.humanValues) {
            let below = poset.all_below(value);
            let biggest_below = Math.max(...below.map(v => assignation.get(v)));
            if (assignation.get(value) <= biggest_below) {
                assignation.set(value, biggest_below + (1 - biggest_below) * Math.random());
            }
        }
        counter++;
    }
    if (counter == max) {
        throw new Error("Timeout");
    }
    return assignation;
}
function print_assignation(assignation) {
    let values = [...assignation.keys()].sort((a, b) => assignation.get(a) - assignation.get(b));
    return values;
}
function combine_values(v1, v2) {
    return v1 + "::" + v2;
}
var Comparison;
(function (Comparison) {
    Comparison[Comparison["GreaterThan"] = 1] = "GreaterThan";
    Comparison[Comparison["LessThanOrEqual"] = -1] = "LessThanOrEqual";
    Comparison[Comparison["Unknown"] = 0] = "Unknown";
})(Comparison || (Comparison = {}));
function flip_comparison(comparison) {
    switch (comparison) {
        case Comparison.GreaterThan:
            return Comparison.LessThanOrEqual;
        case Comparison.LessThanOrEqual:
            return Comparison.GreaterThan;
        case Comparison.Unknown:
            return Comparison.Unknown;
    }
}
var Categories;
(function (Categories) {
    Categories["Relationships"] = "Relationships";
    Categories["Environment"] = "Environment";
    Categories["Hobbies"] = "Hobbies";
    Categories["Career"] = "Career";
    Categories["LongTerm"] = "LongTerm";
    Categories["Community"] = "Community";
})(Categories || (Categories = {}));
class PersonalValue {
    constructor(shortName, description, categories) {
        this.shortName = shortName;
        this.description = description;
        this.categories = categories;
    }
}
let AllValues = [
    new PersonalValue("Acknowledgement", "Have your opinions heard", [Categories.Career]),
    new PersonalValue("Adventure", "Finding new excitements", [Categories.LongTerm]),
    new PersonalValue("Appearance", "How you look", [Categories.Hobbies]),
    new PersonalValue("Bustle", "Always having something going on", [Categories.Environment]),
    new PersonalValue("Challenge", "Pushing yourself, regardless of the goal", [Categories.LongTerm]),
    new PersonalValue("Community", "Being part of a large group", [Categories.Community]),
    new PersonalValue("Curiosity", "Encountering new ideas", [Categories.LongTerm]),
    new PersonalValue("Cooking", "Preparing food in your own home", [Categories.Environment, Categories.Hobbies]),
    new PersonalValue("Dancing", "Structured or doing your own thing", [Categories.Hobbies]),
    new PersonalValue("Exercise", "Things you do to keep fit, but not competitive", [Categories.Hobbies]),
    new PersonalValue("Faith", "Connection to something beyond humanity", [Categories.Community]),
    new PersonalValue("Family", "Regular connection with family", [Categories.Relationships, Categories.Community]),
    new PersonalValue("Fresh Air", "Access to a clean environment", [Categories.Environment]),
    new PersonalValue("Friendship", "Deep relationships within a small group", [Categories.Relationships]),
    new PersonalValue("Games", "Boardgames, cards, computer games, etc.", [Categories.Hobbies]),
    new PersonalValue("Gardening", "A place and the time to grow plants", [Categories.Hobbies, Categories.Environment]),
    new PersonalValue("Giving Gifts", "Finding or making gifts for others", [Categories.Hobbies, Categories.Relationships]),
    new PersonalValue("Growth", "Knowing you are changing and adapting", [Categories.LongTerm, Categories.Career]),
    new PersonalValue("Helping Others", "Working to help those around you", [Categories.Career]),
    new PersonalValue("Leadership", "People look to you for guidance", [Categories.Career]),
    new PersonalValue("Learning", "Amassing knowledge and skills", [Categories.Hobbies]),
    new PersonalValue("Love", "Finding people to share your heart with", [Categories.Relationships]),
    new PersonalValue("Peace", "Calm, tranquillity, silence", [Categories.Environment]),
    new PersonalValue("Pets", "Having pets at home", [Categories.Environment, Categories.Relationships]),
    new PersonalValue("Performing Arts", "Music, theatre, etc.", [Categories.Hobbies]),
    new PersonalValue("Politics", "Serving the public", [Categories.Career]),
    new PersonalValue("Physical Independence", "Living without routine assistance", [Categories.Environment]),
    new PersonalValue("Quality Time", "Being with friends or loved ones, no matter the activity", [Categories.Hobbies]),
    new PersonalValue("Literature", "Reading and writing", [Categories.Hobbies]),
    new PersonalValue("Religion", "The routine, structure, and community, as opposed to Faith", [Categories.Community]),
    new PersonalValue("Reputation", "The things strangers might know you for", [Categories.Career]),
    new PersonalValue("Responsibility", "Being trusted by others", [Categories.Career]),
    new PersonalValue("Stability", "Confidence that next week will be like this week", [Categories.LongTerm, Categories.Environment]),
    new PersonalValue("Status", "The higher up the ladder the better", [Categories.Career]),
    new PersonalValue("Sport", "Competitive exercise", [Categories.Hobbies]),
    new PersonalValue("Visual Arts and Crafts", "Creating and admiring", [Categories.Hobbies]),
    new PersonalValue("Wealth", "Beyond financial stability", [Categories.Career]),
];
function values_by_category(categories) {
    let set_of_categories = new Set(categories);
    let should_include = (pv) => pv.categories.filter(i => set_of_categories.has(i)).length > 0;
    return AllValues.filter(should_include).map(pv => pv.shortName);
}
let Definitions = {};
AllValues.forEach(pv => { Definitions[pv.shortName] = pv.description; });
function markdown_all_values() {
    let by_category = new Map();
    AllValues.forEach(pv => {
        pv.categories.forEach(c => by_category.set(c, []));
    });
    AllValues.forEach(pv => {
        pv.categories.forEach(c => by_category.get(c).push(pv));
    });
    let s = "";
    for (let cat of [...by_category.keys()].sort()) {
        let pvs = by_category.get(cat);
        s += category_long_name(cat) + ":\n\n";
        pvs.map(pv => pv.shortName).sort().forEach(short => s += " - " + short + ": " + Definitions[short] + "\n");
        s += "\n";
    }
    return s;
}
function category_long_name(category) {
    switch (category) {
        case Categories.Career:
            return "Career";
        case Categories.Hobbies:
            return "Hobbies";
        case Categories.Environment:
            return "Home Environment";
        case Categories.LongTerm:
            return "Long Term Attitudes";
        case Categories.Relationships:
            return "Relationships and Faith";
        case Categories.Community:
            return "Community and Faith";
    }
}
class ValuesGame {
    constructor(max_interest, categories) {
        this.max_interest = max_interest;
        this.categories = categories;
        this.poset_history = [];
        this.comparison_history = [];
        this.poset_history.push(new ComparisonPoset(values_by_category(categories)));
    }
    poset() {
        // Top one is always most recent
        return this.poset_history[0];
    }
    of_interest() {
        let poset = this.poset();
        let sorted = poset.fully_determined();
        if (sorted < this.max_interest) {
            let next_level = poset.maximal_top_n(sorted + 1).filter(v => !poset.is_determined(v));
            if (next_level.length > 1) {
                let first_choice = rFrom(next_level.map(v => [v, 1]));
                let second_choice = rFrom(next_level.filter(v => v != first_choice).map(v => [v, 1]));
                return [true, [first_choice, second_choice]];
            }
        }
        return [false, []];
    }
    choose(v1, v2) {
        this.poset_history.unshift(this.poset().add_greater_than(v1, v2));
        this.comparison_history.unshift([v1, v2]);
        this.suggest();
    }
    suggest() {
        clear_choice_div();
        let pair = this.of_interest();
        if (pair[0] != false) {
            draw_choice(pair[1][0], pair[1][1]);
            draw_estimate(this.poset().estimate_questions_remaining(this.max_interest));
        }
        else {
            draw_assignment(this.poset().print_valid().reverse().slice(0, this.max_interest));
            hide_estimate();
        }
        draw_history(this.comparison_history);
    }
    undo() {
        if (this.poset_history.length > 1) {
            this.poset_history.shift();
            this.comparison_history.shift();
            hide_assignment();
        }
        this.suggest();
    }
    remaining() {
        return this.poset().estimate_questions_remaining(this.max_interest);
    }
}
function clear_history() {
    let div = document.getElementById("history");
    div.innerHTML = "";
}
function draw_history(comparisons) {
    clear_history();
    let div = document.getElementById("history");
    if (comparisons.length > 0) {
        let label = document.createElement("div");
        let undoButton = document.createElement("button");
        undoButton.addEventListener("click", ev => {
            VG.undo();
        });
        undoButton.classList.add("undo-button");
        undoButton.innerText = "Undo Last";
        label.appendChild(undoButton);
        label.classList.add("three-wide");
        div.appendChild(label);
        comparisons.forEach(c => {
            let cp1 = document.createElement("div");
            let cp2 = document.createElement("div");
            let cp3 = document.createElement("div");
            cp1.innerText = c[0];
            cp2.textContent = ">";
            cp3.innerText = c[1];
            div.appendChild(cp1);
            div.appendChild(cp2);
            div.appendChild(cp3);
        });
    }
}
function clear_choice_div() {
    let div = document.getElementById("comparisons");
    div.innerHTML = "";
}
function hide_estimate() {
    let div = document.getElementById("estimate");
    div.classList.add("invisible");
    div.innerHTML = "";
}
function draw_estimate(estimate) {
    let div = document.getElementById("estimate");
    div.classList.remove("invisible");
    let estimate_text = estimate.toString();
    if (estimate < 10) {
        estimate_text = "Under 10";
    }
    div.innerHTML = `Estimated questions remaining: ${estimate_text}`;
}
function hide_assignment() {
    let div = document.getElementById("assignment");
    div.classList.add("invisible");
    div.innerHTML = "";
}
function draw_assignment(values) {
    let div = document.getElementById("assignment");
    div.classList.remove("invisible");
    div.innerHTML = `<h1>Your top values, ranked</h1>` + values.map(v => `<div class='valueReport'><h2>${v}</h2><p>${Definitions[v]}</p></div>`).join("\n");
}
function rFrom(weighted) {
    let total = (weighted.map(v => v[1])).reduce((a, b) => a + b);
    let r = Math.random() * total;
    while (r > 0) {
        let popped = weighted.pop();
        r -= popped[1];
        if (r < 0) {
            return popped[0];
        }
    }
    // Should never reach here
    throw new Error("Weighted list was empty");
}
function draw_choice(v1, v2) {
    let div = document.getElementById("comparisons");
    function button(v, w) {
        let b = document.createElement("button");
        b.innerText = v;
        b.addEventListener("click", ev => {
            VG.choose(v, w);
        });
        b.classList.add("values");
        return b;
    }
    function mini_label(v) {
        let d = document.createElement("div");
        d.innerText = Definitions[v];
        d.classList.add("definition");
        return d;
    }
    let label = document.createElement("h1");
    label.classList.add("header");
    label.classList.add("two-wide");
    label.innerHTML = "Which is more important?";
    clear_choice_div();
    div.appendChild(label);
    div.appendChild(button(v1, v2));
    div.appendChild(button(v2, v1));
    div.appendChild(mini_label(v1));
    div.appendChild(mini_label(v2));
}
let VG;
function start() {
    let max_and_categories = read_GET();
    let categories = max_and_categories[1];
    let max_to_determine = max_and_categories[0];
    VG = new ValuesGame(max_to_determine, categories);
    VG.suggest();
}
let read_GET = function () {
    let break_at_question_mark = window.location.toString().split(/\?/);
    let all_categories = Object.keys(Categories).filter(k => Number.isNaN(+k));
    if (break_at_question_mark.length == 1) {
        return [5, all_categories];
    }
    let instructions = break_at_question_mark[1];
    let max_to_find = 5;
    let categories_to_include = all_categories;
    instructions.split("&").map(s => {
        let parts = s.split("=");
        if (parts[0] == "include") {
            categories_to_include = [];
            let cats = parts[1].split(",");
            cats.forEach(requested_cat => {
                all_categories.forEach(real_cat => {
                    if (real_cat == requested_cat) {
                        categories_to_include.push(real_cat);
                    }
                });
            });
        }
        if (parts[0] == "max") {
            max_to_find = parseInt(parts[1]);
        }
    });
    return [max_to_find, categories_to_include];
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21wYXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFNLGVBQWU7SUFFakIsWUFBcUIsV0FBcUIsRUFBRSxZQUFxQyxJQUFJLEdBQUcsRUFBRTtRQUFyRSxnQkFBVyxHQUFYLFdBQVcsQ0FBVTtRQUQxQyxjQUFTLEdBQTRCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFMUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUNyQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNsRSxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFBO1NBQ0w7SUFDTCxDQUFDO0lBQ0QsVUFBVSxDQUFDLEVBQVUsRUFBRSxFQUFVO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBZSxDQUFBO0lBQ25FLENBQUM7SUFDRCxTQUFTLENBQUMsRUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFDRCxTQUFTLENBQUMsRUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFDRCxnQkFBZ0IsQ0FBQyxNQUFjLEVBQUUsS0FBYTtRQUMxQyxJQUFJLGdCQUFnQixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM5RCxJQUFJLGVBQWUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdEIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDckIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDckQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM3RCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYTtRQUNsQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQ2pDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDaEIsQ0FBQztJQUVELFdBQVc7UUFDUCxPQUFPLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxjQUFjO1FBQ1YsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFBO0lBQ2hDLENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTyxDQUFDLEdBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxlQUF1QjtRQUNoRCwrQ0FBK0M7UUFDL0MsZ0NBQWdDO1FBRWhDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBRXZDLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7UUFFckUsMkVBQTJFO1FBQzNFLElBQUksNEJBQTRCLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUVqRCxxRUFBcUU7UUFFckUsc0NBQXNDO1FBQ3RDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4RCxJQUFJLG1DQUFtQyxHQUFHLFNBQVMsR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFekUsSUFBSSxRQUFRLEdBQUcsNEJBQTRCLEdBQUcsR0FBRyxHQUFHLG1DQUFtQyxDQUFBO1FBQ3ZGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQyxnQ0FBZ0M7SUFDcEUsQ0FBQztJQUVELGFBQWEsQ0FBQyxLQUFhO1FBQ3ZCLHVGQUF1RjtRQUN2RixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUE7SUFDdEcsQ0FBQztJQUVELGdCQUFnQjtRQUNaLHFEQUFxRDtRQUNyRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtJQUNyRSxDQUFDO0lBRUQsYUFBYSxDQUFDLENBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFRCxXQUFXLENBQUMsS0FBYTtRQUNyQiwyQ0FBMkM7UUFDM0Msc0RBQXNEO1FBQ3RELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFBO0lBQ3JHLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBVztRQUVmLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUV4RSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGlCQUFpQixDQUM1QyxDQUFDLEVBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFDbkIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDbEYsQ0FBQyxDQUFBO0lBQ04sQ0FBQztDQUNKO0FBRUQsU0FBUyxRQUFRLENBQU8sUUFBbUI7SUFDdkMsSUFBSSxDQUFDLEdBQWMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUM3QixDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ3pCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUNGLE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVELE1BQU0saUJBQWlCO0lBQ25CLFlBQXFCLEtBQWEsRUFBVyxNQUFjLEVBQVcsbUJBQTZCO1FBQTlFLFVBQUssR0FBTCxLQUFLLENBQVE7UUFBVyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVcsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFVO0lBQUksQ0FBQztDQUMzRztBQUVELFNBQVMsZUFBZSxDQUFDLEtBQXNCO0lBQzNDLElBQUksV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBQzNDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyRSxJQUFJLFNBQVMsR0FBRztRQUNaLHlFQUF5RTtRQUN6RSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDakMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNsQyxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFlLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQWUsSUFBSSxhQUFhLEVBQUU7Z0JBQ3ZELE9BQU8sSUFBSSxDQUFBO2FBQ2Q7U0FDSjtRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2hCLENBQUMsQ0FBQTtJQUNELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtJQUNmLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQTtJQUNiLE9BQU8sU0FBUyxFQUFFLElBQUksT0FBTyxHQUFHLEdBQUcsRUFBRTtRQUNqQyxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDakMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNsQyxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFXLENBQUMsQ0FBQyxDQUFBO1lBQzdFLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQVcsSUFBSSxhQUFhLEVBQUU7Z0JBQ25ELFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTthQUM5RTtTQUNKO1FBQ0QsT0FBTyxFQUFFLENBQUE7S0FDWjtJQUNELElBQUksT0FBTyxJQUFJLEdBQUcsRUFBRTtRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQzdCO0lBQ0QsT0FBTyxXQUFXLENBQUE7QUFDdEIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsV0FBZ0M7SUFDdkQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFZLEdBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQVksQ0FBQyxDQUFBO0lBQ3BILE9BQU8sTUFBTSxDQUFBO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxFQUFVLEVBQUUsRUFBVTtJQUMxQyxPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0FBQ3pCLENBQUM7QUFFRCxJQUFLLFVBRUo7QUFGRCxXQUFLLFVBQVU7SUFDWCx5REFBZSxDQUFBO0lBQUUsa0VBQW9CLENBQUE7SUFBRSxpREFBVyxDQUFBO0FBQ3RELENBQUMsRUFGSSxVQUFVLEtBQVYsVUFBVSxRQUVkO0FBRUQsU0FBUyxlQUFlLENBQUMsVUFBc0I7SUFDM0MsUUFBUSxVQUFVLEVBQUU7UUFDaEIsS0FBSyxVQUFVLENBQUMsV0FBVztZQUN2QixPQUFPLFVBQVUsQ0FBQyxlQUFlLENBQUE7UUFDckMsS0FBSyxVQUFVLENBQUMsZUFBZTtZQUMzQixPQUFPLFVBQVUsQ0FBQyxXQUFXLENBQUE7UUFDakMsS0FBSyxVQUFVLENBQUMsT0FBTztZQUNuQixPQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUE7S0FDaEM7QUFDTCxDQUFDO0FBSUQsSUFBSyxVQU9KO0FBUEQsV0FBSyxVQUFVO0lBQ1gsNkNBQStCLENBQUE7SUFDL0IseUNBQTJCLENBQUE7SUFDM0IsaUNBQW1CLENBQUE7SUFDbkIsK0JBQWlCLENBQUE7SUFDakIsbUNBQXFCLENBQUE7SUFDckIscUNBQXVCLENBQUE7QUFDM0IsQ0FBQyxFQVBJLFVBQVUsS0FBVixVQUFVLFFBT2Q7QUFHRCxNQUFNLGFBQWE7SUFDZixZQUFxQixTQUFpQixFQUFXLFdBQW1CLEVBQVcsVUFBd0I7UUFBbEYsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVcsZUFBVSxHQUFWLFVBQVUsQ0FBYztJQUFJLENBQUM7Q0FDL0c7QUFHRCxJQUFJLFNBQVMsR0FBb0I7SUFDN0IsSUFBSSxhQUFhLENBQUMsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckYsSUFBSSxhQUFhLENBQUMsV0FBVyxFQUFFLHlCQUF5QixFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hGLElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckUsSUFBSSxhQUFhLENBQUMsUUFBUSxFQUFFLGtDQUFrQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pGLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRSwwQ0FBMEMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRyxJQUFJLGFBQWEsQ0FBQyxXQUFXLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDckYsSUFBSSxhQUFhLENBQUMsV0FBVyxFQUFFLHdCQUF3QixFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9FLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdHLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxvQ0FBb0MsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4RixJQUFJLGFBQWEsQ0FBQyxVQUFVLEVBQUUsZ0RBQWdELEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckcsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdGLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxnQ0FBZ0MsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQy9HLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRSwrQkFBK0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN6RixJQUFJLGFBQWEsQ0FBQyxZQUFZLEVBQUUseUNBQXlDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDdEcsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNGLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRSxxQ0FBcUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25ILElBQUksYUFBYSxDQUFDLGNBQWMsRUFBRSxvQ0FBb0MsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3ZILElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSx1Q0FBdUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlHLElBQUksYUFBYSxDQUFDLGdCQUFnQixFQUFFLGtDQUFrQyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVGLElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN2RixJQUFJLGFBQWEsQ0FBQyxVQUFVLEVBQUUsK0JBQStCLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDcEYsSUFBSSxhQUFhLENBQUMsTUFBTSxFQUFFLHlDQUF5QyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2hHLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRixJQUFJLGFBQWEsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNwRyxJQUFJLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRixJQUFJLGFBQWEsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEUsSUFBSSxhQUFhLENBQUMsdUJBQXVCLEVBQUUsbUNBQW1DLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekcsSUFBSSxhQUFhLENBQUMsY0FBYyxFQUFFLDBEQUEwRCxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25ILElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1RSxJQUFJLGFBQWEsQ0FBQyxVQUFVLEVBQUUsNERBQTRELEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkgsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLHlDQUF5QyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9GLElBQUksYUFBYSxDQUFDLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25GLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRSxrREFBa0QsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2pJLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxxQ0FBcUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN2RixJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEUsSUFBSSxhQUFhLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDMUYsSUFBSSxhQUFhLENBQUMsUUFBUSxFQUFFLDRCQUE0QixFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ2pGLENBQUE7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFVBQXdCO0lBQ2hELElBQUksaUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDM0MsSUFBSSxjQUFjLEdBQUcsQ0FBQyxFQUFpQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFFMUcsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUNuRSxDQUFDO0FBRUQsSUFBSSxXQUFXLEdBQVEsRUFBRSxDQUFBO0FBQ3pCLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUV2RSxTQUFTLG1CQUFtQjtJQUN4QixJQUFJLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQTtJQUN4RCxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ25CLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN0RCxDQUFDLENBQUMsQ0FBQTtJQUNGLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDbkIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBRSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRixDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNWLEtBQUssSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzVDLElBQUksR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFvQixDQUFBO1FBQ2pELENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUE7UUFDdEMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQzFHLENBQUMsSUFBSSxJQUFJLENBQUE7S0FDWjtJQUNELE9BQU8sQ0FBQyxDQUFBO0FBQ1osQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsUUFBb0I7SUFDNUMsUUFBUSxRQUFRLEVBQUU7UUFDZCxLQUFLLFVBQVUsQ0FBQyxNQUFNO1lBQ2xCLE9BQU8sUUFBUSxDQUFBO1FBQ25CLEtBQUssVUFBVSxDQUFDLE9BQU87WUFDbkIsT0FBTyxTQUFTLENBQUE7UUFDcEIsS0FBSyxVQUFVLENBQUMsV0FBVztZQUN2QixPQUFPLGtCQUFrQixDQUFBO1FBQzdCLEtBQUssVUFBVSxDQUFDLFFBQVE7WUFDcEIsT0FBTyxxQkFBcUIsQ0FBQTtRQUNoQyxLQUFLLFVBQVUsQ0FBQyxhQUFhO1lBQ3pCLE9BQU8seUJBQXlCLENBQUE7UUFDcEMsS0FBSyxVQUFVLENBQUMsU0FBUztZQUNyQixPQUFPLHFCQUFxQixDQUFBO0tBQ25DO0FBQ0wsQ0FBQztBQUVELE1BQU0sVUFBVTtJQU9aLFlBQXFCLFlBQW9CLEVBQVcsVUFBd0I7UUFBdkQsaUJBQVksR0FBWixZQUFZLENBQVE7UUFBVyxlQUFVLEdBQVYsVUFBVSxDQUFjO1FBTjVFLGtCQUFhLEdBQXNCLEVBQUUsQ0FBQTtRQUNyQyx1QkFBa0IsR0FBdUIsRUFBRSxDQUFBO1FBTXZDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksZUFBZSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNoRixDQUFDO0lBTkQsS0FBSztRQUNELGdDQUFnQztRQUNoQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUlELFdBQVc7UUFDUCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDeEIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFFckMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUM1QixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUlyRixJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN2QixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDckQsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNyRixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7YUFDL0M7U0FDSjtRQUNELE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUNELE1BQU0sQ0FBQyxFQUFVLEVBQUUsRUFBVTtRQUN6QixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0lBQ0QsT0FBTztRQUNILGdCQUFnQixFQUFFLENBQUE7UUFDbEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzdCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssRUFBRTtZQUNsQixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25DLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7U0FDOUU7YUFBTTtZQUNILGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtZQUNqRixhQUFhLEVBQUUsQ0FBQTtTQUNsQjtRQUNELFlBQVksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBQ0QsSUFBSTtRQUNBLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9CLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDMUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQy9CLGVBQWUsRUFBRSxDQUFBO1NBQ3BCO1FBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7Q0FDSjtBQUVELFNBQVMsYUFBYTtJQUNsQixJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzVDLEdBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO0FBQ3ZCLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxXQUErQjtJQUNqRCxhQUFhLEVBQUUsQ0FBQTtJQUVmLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDNUMsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUV4QixJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3pDLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRTtZQUN0QyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDYixDQUFDLENBQUMsQ0FBQTtRQUNGLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3ZDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFBO1FBQ2xDLEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0IsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDakMsR0FBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QixXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BCLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkMsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN2QyxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBRXZDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLEdBQUcsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFBO1lBQ3JCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXBCLEdBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckIsR0FBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNyQixHQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLENBQUMsQ0FBQyxDQUFBO0tBQ0w7QUFDTCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0I7SUFDckIsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNoRCxHQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtBQUN2QixDQUFDO0FBR0QsU0FBUyxhQUFhO0lBQ2xCLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDN0MsR0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDL0IsR0FBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7QUFDdkIsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLFFBQWdCO0lBQ25DLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDN0MsR0FBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDbEMsSUFBSSxhQUFhLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3ZDLElBQUksUUFBUSxHQUFHLEVBQUUsRUFBRTtRQUNmLGFBQWEsR0FBRyxVQUFVLENBQUE7S0FDN0I7SUFDRCxHQUFJLENBQUMsU0FBUyxHQUFHLGtDQUFrQyxhQUFhLEVBQUUsQ0FBQTtBQUN0RSxDQUFDO0FBSUQsU0FBUyxlQUFlO0lBQ3BCLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDL0MsR0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDL0IsR0FBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7QUFDdkIsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLE1BQWdCO0lBQ3JDLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDL0MsR0FBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDbEMsR0FBSSxDQUFDLFNBQVMsR0FBRyxrQ0FBa0MsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZ0NBQWdDLENBQUMsV0FBWSxXQUFtQixDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDckssQ0FBQztBQUVELFNBQVMsS0FBSyxDQUFJLFFBQXVCO0lBQ3JDLElBQUksS0FBSyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzdELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUE7SUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ1YsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBaUIsQ0FBQTtRQUMxQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ1AsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FDbkI7S0FDSjtJQUNELDBCQUEwQjtJQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7QUFDOUMsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEVBQVUsRUFBRSxFQUFVO0lBQ3ZDLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDaEQsU0FBUyxNQUFNLENBQUMsQ0FBUyxFQUFFLENBQVM7UUFDaEMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDN0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkIsQ0FBQyxDQUFDLENBQUE7UUFDRixDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6QixPQUFPLENBQUMsQ0FBQTtJQUNaLENBQUM7SUFFRCxTQUFTLFVBQVUsQ0FBQyxDQUFTO1FBQ3pCLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckMsQ0FBQyxDQUFDLFNBQVMsR0FBSSxXQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzdCLE9BQU8sQ0FBQyxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDeEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDN0IsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDL0IsS0FBSyxDQUFDLFNBQVMsR0FBRywwQkFBMEIsQ0FBQTtJQUM1QyxnQkFBZ0IsRUFBRSxDQUFBO0lBQ2xCLEdBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkIsR0FBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEMsR0FBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEMsR0FBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoQyxHQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3BDLENBQUM7QUFFRCxJQUFJLEVBQWMsQ0FBQTtBQUNsQixTQUFTLEtBQUs7SUFDVixJQUFJLGtCQUFrQixHQUFHLFFBQVEsRUFBRSxDQUFBO0lBQ25DLElBQUksVUFBVSxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLElBQUksZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUMsRUFBRSxHQUFHLElBQUksVUFBVSxDQUFDLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ2pELEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUNoQixDQUFDO0FBRUQsSUFBSSxRQUFRLEdBQUc7SUFDWCxJQUFJLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25FLElBQUksY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFpQixDQUFDO0lBQzNGLElBQUksc0JBQXNCLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtRQUNwQyxPQUFPLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0tBQzdCO0lBQ0QsSUFBSSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUMsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFBO0lBQ25CLElBQUkscUJBQXFCLEdBQUcsY0FBYyxDQUFBO0lBQzFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzVCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDeEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxFQUFFO1lBQ3ZCLHFCQUFxQixHQUFHLEVBQUUsQ0FBQTtZQUMxQixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3pCLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQzlCLElBQUksUUFBUSxJQUFJLGFBQWEsRUFBRTt3QkFDM0IscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO3FCQUN2QztnQkFDTCxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFBO1NBQ0w7UUFDRCxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUU7WUFDbkIsV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUNuQztJQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ0YsT0FBTyxDQUFDLFdBQVcsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO0FBQy9DLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImNsYXNzIENvbXBhcmlzb25Qb3NldCB7XG4gICAgb3JkZXJpbmdzOiBNYXA8c3RyaW5nLCBDb21wYXJpc29uPiA9IG5ldyBNYXAoKVxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGh1bWFuVmFsdWVzOiBzdHJpbmdbXSwgb3JkZXJpbmdzOiBNYXA8c3RyaW5nLCBDb21wYXJpc29uPiA9IG5ldyBNYXAoKSkge1xuICAgICAgICB0aGlzLm9yZGVyaW5ncyA9IGNvcHlfbWFwKG9yZGVyaW5ncylcbiAgICAgICAgaWYgKFsuLi5vcmRlcmluZ3MudmFsdWVzKCldLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmh1bWFuVmFsdWVzLm1hcCh2MSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5odW1hblZhbHVlcy5tYXAodjIgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9yZGVyaW5ncy5zZXQoY29tYmluZV92YWx1ZXModjEsIHYyKSwgQ29tcGFyaXNvbi5Vbmtub3duKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuICAgIGNvbXBhcmlzb24odjE6IHN0cmluZywgdjI6IHN0cmluZyk6IENvbXBhcmlzb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5vcmRlcmluZ3MuZ2V0KGNvbWJpbmVfdmFsdWVzKHYxLCB2MikpIGFzIENvbXBhcmlzb25cbiAgICB9XG4gICAgYWxsX2Fib3ZlKHYxOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2MiA9PiB0aGlzLmNvbXBhcmlzb24odjIsIHYxKSA9PSBDb21wYXJpc29uLkdyZWF0ZXJUaGFuKVxuICAgIH1cbiAgICBhbGxfYmVsb3codjE6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYyID0+IHRoaXMuY29tcGFyaXNvbih2MSwgdjIpID09IENvbXBhcmlzb24uR3JlYXRlclRoYW4pXG4gICAgfVxuICAgIGFkZF9ncmVhdGVyX3RoYW4oaGlnaGVyOiBzdHJpbmcsIGxvd2VyOiBzdHJpbmcpOiBDb21wYXJpc29uUG9zZXQge1xuICAgICAgICBsZXQgaGlnaGVyX2FuZF9hYm92ZSA9IFtoaWdoZXJdLmNvbmNhdCh0aGlzLmFsbF9hYm92ZShoaWdoZXIpKVxuICAgICAgICBsZXQgbG93ZXJfYW5kX2JlbG93ID0gW2xvd2VyXS5jb25jYXQodGhpcy5hbGxfYmVsb3cobG93ZXIpKVxuICAgICAgICBsZXQgbyA9IGNvcHlfbWFwKHRoaXMub3JkZXJpbmdzKVxuICAgICAgICBoaWdoZXJfYW5kX2Fib3ZlLm1hcCh2MSA9PiB7XG4gICAgICAgICAgICBsb3dlcl9hbmRfYmVsb3cubWFwKHYyID0+IHtcbiAgICAgICAgICAgICAgICBvLnNldChjb21iaW5lX3ZhbHVlcyh2MSwgdjIpLCBDb21wYXJpc29uLkdyZWF0ZXJUaGFuKVxuICAgICAgICAgICAgICAgIG8uc2V0KGNvbWJpbmVfdmFsdWVzKHYyLCB2MSksIENvbXBhcmlzb24uTGVzc1RoYW5PckVxdWFsKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gbmV3IENvbXBhcmlzb25Qb3NldCh0aGlzLmh1bWFuVmFsdWVzLCBvKVxuICAgIH1cblxuICAgIHN1cHJlbXVtKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBsZXQgYWJvdmUgPSB0aGlzLmFsbF9hYm92ZSh2YWx1ZSlcbiAgICAgICAgaWYgKGFib3ZlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN1cHJlbXVtKGFib3ZlWzBdKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cblxuICAgIHByaW50X3ZhbGlkKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIHByaW50X2Fzc2lnbmF0aW9uKGFzc2lnbl9vcmRlcmluZyh0aGlzKSlcbiAgICB9XG5cbiAgICBudW1fY29tcG9uZW50cygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5zdXByZW1hKCkubGVuZ3RoXG4gICAgfVxuXG4gICAgc3VwcmVtYSgpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBbLi4uIG5ldyBTZXQodGhpcy5odW1hblZhbHVlcy5tYXAodiA9PiB0aGlzLnN1cHJlbXVtKHYpKSldXG4gICAgfVxuXG4gICAgZXN0aW1hdGVfcXVlc3Rpb25zX3JlbWFpbmluZyhkZXRlcm1pbmVfdG9wX246IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIC8vIHN0cmF0ZWd5OiBhY2N1cmF0ZSBtZWFzdXJlIGZvciB0aGUgdG9wIGxldmVsXG4gICAgICAgIC8vIHRoZW4gYSBoZXVyaXN0aWMgZm9yIHRoZSByZXN0XG5cbiAgICAgICAgbGV0IGNvbXBsZXRlZCA9IHRoaXMuZnVsbHlfZGV0ZXJtaW5lZCgpXG5cbiAgICAgICAgbGV0IG5leHRfbGV2ZWwgPSB0aGlzLm1heGltYWxfdG9wX24oY29tcGxldGVkICsgMSkubGVuZ3RoIC0gY29tcGxldGVkXG5cbiAgICAgICAgLy8gSG93IG1hbnkgcXVlc3Rpb25zIHRvIGNvbm5lY3QgYWxsIGNvbXBvbmVudHMsIHRoZW4gZnVsbHkgZGV0ZXJtaW5lIHRvcCBuXG4gICAgICAgIGxldCBxdWVzdGlvbnNfdG9fbGlua19jb21wb25lbnRzID0gbmV4dF9sZXZlbCAtIDFcblxuICAgICAgICAvLyBOb3cgd29yayBvdXQgaG93IG1hbnkgcXVlc3Rpb25zIG9uY2Ugd2UgaGF2ZSBsaW5rZWQgYWxsIGNvbXBvbmVudHNcblxuICAgICAgICAvLyBNb3N0IGxpa2VseSBzY2VuYXJpbyBpcyBiaW5hcnkgdHJlZVxuICAgICAgICBsZXQgcmVtYWluaW5nID0gTWF0aC5tYXgoZGV0ZXJtaW5lX3RvcF9uIC0gY29tcGxldGVkLCAxKVxuICAgICAgICBsZXQgcXVlc3Rpb25zX3RvX2ZpbGxfdG9wX3Nwb3RzX3R5cGljYWwgPSByZW1haW5pbmcgKiAocmVtYWluaW5nIC0gMSkgLyAyXG5cbiAgICAgICAgbGV0IGVzdGltYXRlID0gcXVlc3Rpb25zX3RvX2xpbmtfY29tcG9uZW50cyArIDEuNSAqIHF1ZXN0aW9uc190b19maWxsX3RvcF9zcG90c190eXBpY2FsXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKGVzdGltYXRlKSArIDMgLy8gcGx1cyAzIHRvIGJlIG9uIHRoZSBzYWZlIHNpZGVcbiAgICB9XG5cbiAgICBpc19kZXRlcm1pbmVkKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgLy8gRnVsbHkgZGV0ZXJtaW5lZCB2YWx1ZXMgaGF2ZSBjb21wYXJpc29ucyBrbm93biBldmVyeXdoZXJlLCBleGNlcHQgYWdhaW5zdCB0aGVtc2VsdmVzXG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2MiA9PiB0aGlzLmNvbXBhcmlzb24odmFsdWUsIHYyKSA9PSBDb21wYXJpc29uLlVua25vd24pLmxlbmd0aCA9PSAxXG4gICAgfVxuXG4gICAgZnVsbHlfZGV0ZXJtaW5lZCgpOiBudW1iZXIge1xuICAgICAgICAvLyBOdW1iZXIgd2l0aCBubyB1bmtub3duIGVudHJpZXMgKGJlc2lkZSB0aGVtc2VsdmVzKVxuICAgICAgICByZXR1cm4gdGhpcy5odW1hblZhbHVlcy5maWx0ZXIodiA9PiB0aGlzLmlzX2RldGVybWluZWQodikpLmxlbmd0aFxuICAgIH1cblxuICAgIG1heGltYWxfdG9wX24objogbnVtYmVyKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5odW1hblZhbHVlcy5maWx0ZXIodiA9PiB0aGlzLmFsbF9hYm92ZSh2KS5sZW5ndGggPCBuKVxuICAgIH1cblxuICAgIF9tYXhfcmF0aW5nKHZhbHVlOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICAvLyAwLWluZGV4ZWQsIDAgbWVhbnMgZGVmaW5pdGVseSBhdCB0aGUgdG9wXG4gICAgICAgIC8vIHJhdGluZyBvZiBuIG1lYW5zIHRoZXJlIGFyZSBuIGRlZmluaXRlbHkgYWJvdmUgdGhpc1xuICAgICAgICByZXR1cm4gdGhpcy5odW1hblZhbHVlcy5maWx0ZXIodjIgPT4gdGhpcy5jb21wYXJpc29uKHYyLCB2YWx1ZSkgPT0gQ29tcGFyaXNvbi5HcmVhdGVyVGhhbikubGVuZ3RoXG4gICAgfVxuXG4gICAgcmF0aW5ncyhtYXg6IG51bWJlcik6IFJhdGluZ0luZm9ybWF0aW9uW10ge1xuXG4gICAgICAgIGxldCBxdWFsaWZ5aW5nID0gdGhpcy5odW1hblZhbHVlcy5maWx0ZXIodiA9PiB0aGlzLl9tYXhfcmF0aW5nKHYpIDwgbWF4KVxuXG4gICAgICAgIHJldHVybiBxdWFsaWZ5aW5nLm1hcCh2ID0+IG5ldyBSYXRpbmdJbmZvcm1hdGlvbihcbiAgICAgICAgICAgIHYsXG4gICAgICAgICAgICB0aGlzLl9tYXhfcmF0aW5nKHYpLFxuICAgICAgICAgICAgcXVhbGlmeWluZy5maWx0ZXIodyA9PiB0aGlzLmNvbXBhcmlzb24odiwgdykgPT0gQ29tcGFyaXNvbi5Vbmtub3duICYmICh2ICE9IHcpKVxuICAgICAgICApKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY29weV9tYXA8SywgVj4ob3JkZXJpbmc6IE1hcDxLLCBWPik6IE1hcDxLLCBWPiB7XG4gICAgbGV0IG86IE1hcDxLLCBWPiA9IG5ldyBNYXAoKTtcbiAgICBbLi4ub3JkZXJpbmcua2V5cygpXS5tYXAoayA9PiB7XG4gICAgICAgIG8uc2V0KGssIG9yZGVyaW5nLmdldChrKSBhcyBWKVxuICAgIH0pXG4gICAgcmV0dXJuIG9cbn1cblxuY2xhc3MgUmF0aW5nSW5mb3JtYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHZhbHVlOiBzdHJpbmcsIHJlYWRvbmx5IHJhdGluZzogbnVtYmVyLCByZWFkb25seSB1bmtub3duX2NvbXBhcmlzb25zOiBzdHJpbmdbXSkgeyB9XG59XG5cbmZ1bmN0aW9uIGFzc2lnbl9vcmRlcmluZyhwb3NldDogQ29tcGFyaXNvblBvc2V0KTogTWFwPHN0cmluZywgbnVtYmVyPiB7XG4gICAgbGV0IGFzc2lnbmF0aW9uID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKVxuICAgIHBvc2V0Lmh1bWFuVmFsdWVzLm1hcCh2YWx1ZSA9PiBhc3NpZ25hdGlvbi5zZXQodmFsdWUsIE1hdGgucmFuZG9tKCkpKVxuICAgIGxldCBtaXNzbWF0Y2ggPSBmdW5jdGlvbiAoKTogQm9vbGVhbiB7XG4gICAgICAgIC8vIE5lZWQgdG8gY2hlY2sgdGhhdCBpZiBhID4gYiBpbiB0aGUgcG9zZXQgdGhlbiBhID4gYiBpbiB0aGUgYXNzaWduYXRpb25cbiAgICAgICAgZm9yIChsZXQgdmFsdWUgb2YgcG9zZXQuaHVtYW5WYWx1ZXMpIHtcbiAgICAgICAgICAgIGxldCBiZWxvdyA9IHBvc2V0LmFsbF9iZWxvdyh2YWx1ZSlcbiAgICAgICAgICAgIGxldCBiaWdnZXN0X2JlbG93ID0gTWF0aC5tYXgoLi4uYmVsb3cubWFwKHYgPT4gYXNzaWduYXRpb24uZ2V0KHYpIGFzIENvbXBhcmlzb24pKVxuICAgICAgICAgICAgaWYgKGFzc2lnbmF0aW9uLmdldCh2YWx1ZSkgYXMgQ29tcGFyaXNvbiA8PSBiaWdnZXN0X2JlbG93KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgbGV0IGNvdW50ZXIgPSAwXG4gICAgbGV0IG1heCA9IDEwMFxuICAgIHdoaWxlIChtaXNzbWF0Y2goKSAmJiBjb3VudGVyIDwgbWF4KSB7XG4gICAgICAgIGZvciAobGV0IHZhbHVlIG9mIHBvc2V0Lmh1bWFuVmFsdWVzKSB7XG4gICAgICAgICAgICBsZXQgYmVsb3cgPSBwb3NldC5hbGxfYmVsb3codmFsdWUpXG4gICAgICAgICAgICBsZXQgYmlnZ2VzdF9iZWxvdyA9IE1hdGgubWF4KC4uLmJlbG93Lm1hcCh2ID0+IGFzc2lnbmF0aW9uLmdldCh2KSBhcyBudW1iZXIpKVxuICAgICAgICAgICAgaWYgKGFzc2lnbmF0aW9uLmdldCh2YWx1ZSkgYXMgbnVtYmVyIDw9IGJpZ2dlc3RfYmVsb3cpIHtcbiAgICAgICAgICAgICAgICBhc3NpZ25hdGlvbi5zZXQodmFsdWUsIGJpZ2dlc3RfYmVsb3cgKyAoMSAtIGJpZ2dlc3RfYmVsb3cpICogTWF0aC5yYW5kb20oKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb3VudGVyKytcbiAgICB9XG4gICAgaWYgKGNvdW50ZXIgPT0gbWF4KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRpbWVvdXRcIilcbiAgICB9XG4gICAgcmV0dXJuIGFzc2lnbmF0aW9uXG59XG5cbmZ1bmN0aW9uIHByaW50X2Fzc2lnbmF0aW9uKGFzc2lnbmF0aW9uOiBNYXA8c3RyaW5nLCBudW1iZXI+KTogc3RyaW5nW10ge1xuICAgIGxldCB2YWx1ZXMgPSBbLi4uYXNzaWduYXRpb24ua2V5cygpXS5zb3J0KChhLCBiKSA9PiAoYXNzaWduYXRpb24uZ2V0KGEpIGFzIG51bWJlcikgLSAoYXNzaWduYXRpb24uZ2V0KGIpIGFzIG51bWJlcikpXG4gICAgcmV0dXJuIHZhbHVlc1xufVxuXG5mdW5jdGlvbiBjb21iaW5lX3ZhbHVlcyh2MTogc3RyaW5nLCB2Mjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdjEgKyBcIjo6XCIgKyB2MlxufVxuXG5lbnVtIENvbXBhcmlzb24ge1xuICAgIEdyZWF0ZXJUaGFuID0gMSwgTGVzc1RoYW5PckVxdWFsID0gLTEsIFVua25vd24gPSAwXG59XG5cbmZ1bmN0aW9uIGZsaXBfY29tcGFyaXNvbihjb21wYXJpc29uOiBDb21wYXJpc29uKTogQ29tcGFyaXNvbiB7XG4gICAgc3dpdGNoIChjb21wYXJpc29uKSB7XG4gICAgICAgIGNhc2UgQ29tcGFyaXNvbi5HcmVhdGVyVGhhbjpcbiAgICAgICAgICAgIHJldHVybiBDb21wYXJpc29uLkxlc3NUaGFuT3JFcXVhbFxuICAgICAgICBjYXNlIENvbXBhcmlzb24uTGVzc1RoYW5PckVxdWFsOlxuICAgICAgICAgICAgcmV0dXJuIENvbXBhcmlzb24uR3JlYXRlclRoYW5cbiAgICAgICAgY2FzZSBDb21wYXJpc29uLlVua25vd246XG4gICAgICAgICAgICByZXR1cm4gQ29tcGFyaXNvbi5Vbmtub3duXG4gICAgfVxufVxuXG5cblxuZW51bSBDYXRlZ29yaWVzIHtcbiAgICBSZWxhdGlvbnNoaXBzID0gXCJSZWxhdGlvbnNoaXBzXCIsXG4gICAgRW52aXJvbm1lbnQgPSBcIkVudmlyb25tZW50XCIsXG4gICAgSG9iYmllcyA9IFwiSG9iYmllc1wiLFxuICAgIENhcmVlciA9IFwiQ2FyZWVyXCIsXG4gICAgTG9uZ1Rlcm0gPSBcIkxvbmdUZXJtXCIsXG4gICAgQ29tbXVuaXR5ID0gXCJDb21tdW5pdHlcIlxufVxuXG5cbmNsYXNzIFBlcnNvbmFsVmFsdWUge1xuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHNob3J0TmFtZTogc3RyaW5nLCByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nLCByZWFkb25seSBjYXRlZ29yaWVzOiBDYXRlZ29yaWVzW10pIHsgfVxufVxuXG5cbmxldCBBbGxWYWx1ZXM6IFBlcnNvbmFsVmFsdWVbXSA9IFtcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkFja25vd2xlZGdlbWVudFwiLCBcIkhhdmUgeW91ciBvcGluaW9ucyBoZWFyZFwiLCBbQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkFkdmVudHVyZVwiLCBcIkZpbmRpbmcgbmV3IGV4Y2l0ZW1lbnRzXCIsIFtDYXRlZ29yaWVzLkxvbmdUZXJtXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJBcHBlYXJhbmNlXCIsIFwiSG93IHlvdSBsb29rXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkJ1c3RsZVwiLCBcIkFsd2F5cyBoYXZpbmcgc29tZXRoaW5nIGdvaW5nIG9uXCIsIFtDYXRlZ29yaWVzLkVudmlyb25tZW50XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJDaGFsbGVuZ2VcIiwgXCJQdXNoaW5nIHlvdXJzZWxmLCByZWdhcmRsZXNzIG9mIHRoZSBnb2FsXCIsIFtDYXRlZ29yaWVzLkxvbmdUZXJtXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJDb21tdW5pdHlcIiwgXCJCZWluZyBwYXJ0IG9mIGEgbGFyZ2UgZ3JvdXBcIiwgW0NhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJDdXJpb3NpdHlcIiwgXCJFbmNvdW50ZXJpbmcgbmV3IGlkZWFzXCIsIFtDYXRlZ29yaWVzLkxvbmdUZXJtXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJDb29raW5nXCIsIFwiUHJlcGFyaW5nIGZvb2QgaW4geW91ciBvd24gaG9tZVwiLCBbQ2F0ZWdvcmllcy5FbnZpcm9ubWVudCwgQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJEYW5jaW5nXCIsIFwiU3RydWN0dXJlZCBvciBkb2luZyB5b3VyIG93biB0aGluZ1wiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJFeGVyY2lzZVwiLCBcIlRoaW5ncyB5b3UgZG8gdG8ga2VlcCBmaXQsIGJ1dCBub3QgY29tcGV0aXRpdmVcIiwgW0NhdGVnb3JpZXMuSG9iYmllc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRmFpdGhcIiwgXCJDb25uZWN0aW9uIHRvIHNvbWV0aGluZyBiZXlvbmQgaHVtYW5pdHlcIiwgW0NhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJGYW1pbHlcIiwgXCJSZWd1bGFyIGNvbm5lY3Rpb24gd2l0aCBmYW1pbHlcIiwgW0NhdGVnb3JpZXMuUmVsYXRpb25zaGlwcywgQ2F0ZWdvcmllcy5Db21tdW5pdHldKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkZyZXNoIEFpclwiLCBcIkFjY2VzcyB0byBhIGNsZWFuIGVudmlyb25tZW50XCIsIFtDYXRlZ29yaWVzLkVudmlyb25tZW50XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJGcmllbmRzaGlwXCIsIFwiRGVlcCByZWxhdGlvbnNoaXBzIHdpdGhpbiBhIHNtYWxsIGdyb3VwXCIsIFtDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkdhbWVzXCIsIFwiQm9hcmRnYW1lcywgY2FyZHMsIGNvbXB1dGVyIGdhbWVzLCBldGMuXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkdhcmRlbmluZ1wiLCBcIkEgcGxhY2UgYW5kIHRoZSB0aW1lIHRvIGdyb3cgcGxhbnRzXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXMsIENhdGVnb3JpZXMuRW52aXJvbm1lbnRdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkdpdmluZyBHaWZ0c1wiLCBcIkZpbmRpbmcgb3IgbWFraW5nIGdpZnRzIGZvciBvdGhlcnNcIiwgW0NhdGVnb3JpZXMuSG9iYmllcywgQ2F0ZWdvcmllcy5SZWxhdGlvbnNoaXBzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJHcm93dGhcIiwgXCJLbm93aW5nIHlvdSBhcmUgY2hhbmdpbmcgYW5kIGFkYXB0aW5nXCIsIFtDYXRlZ29yaWVzLkxvbmdUZXJtLCBDYXRlZ29yaWVzLkNhcmVlcl0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiSGVscGluZyBPdGhlcnNcIiwgXCJXb3JraW5nIHRvIGhlbHAgdGhvc2UgYXJvdW5kIHlvdVwiLCBbQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkxlYWRlcnNoaXBcIiwgXCJQZW9wbGUgbG9vayB0byB5b3UgZm9yIGd1aWRhbmNlXCIsIFtDYXRlZ29yaWVzLkNhcmVlcl0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiTGVhcm5pbmdcIiwgXCJBbWFzc2luZyBrbm93bGVkZ2UgYW5kIHNraWxsc1wiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJMb3ZlXCIsIFwiRmluZGluZyBwZW9wbGUgdG8gc2hhcmUgeW91ciBoZWFydCB3aXRoXCIsIFtDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBlYWNlXCIsIFwiQ2FsbSwgdHJhbnF1aWxsaXR5LCBzaWxlbmNlXCIsIFtDYXRlZ29yaWVzLkVudmlyb25tZW50XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJQZXRzXCIsIFwiSGF2aW5nIHBldHMgYXQgaG9tZVwiLCBbQ2F0ZWdvcmllcy5FbnZpcm9ubWVudCwgQ2F0ZWdvcmllcy5SZWxhdGlvbnNoaXBzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJQZXJmb3JtaW5nIEFydHNcIiwgXCJNdXNpYywgdGhlYXRyZSwgZXRjLlwiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJQb2xpdGljc1wiLCBcIlNlcnZpbmcgdGhlIHB1YmxpY1wiLCBbQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBoeXNpY2FsIEluZGVwZW5kZW5jZVwiLCBcIkxpdmluZyB3aXRob3V0IHJvdXRpbmUgYXNzaXN0YW5jZVwiLCBbQ2F0ZWdvcmllcy5FbnZpcm9ubWVudF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUXVhbGl0eSBUaW1lXCIsIFwiQmVpbmcgd2l0aCBmcmllbmRzIG9yIGxvdmVkIG9uZXMsIG5vIG1hdHRlciB0aGUgYWN0aXZpdHlcIiwgW0NhdGVnb3JpZXMuSG9iYmllc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiTGl0ZXJhdHVyZVwiLCBcIlJlYWRpbmcgYW5kIHdyaXRpbmdcIiwgW0NhdGVnb3JpZXMuSG9iYmllc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUmVsaWdpb25cIiwgXCJUaGUgcm91dGluZSwgc3RydWN0dXJlLCBhbmQgY29tbXVuaXR5LCBhcyBvcHBvc2VkIHRvIEZhaXRoXCIsIFtDYXRlZ29yaWVzLkNvbW11bml0eV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUmVwdXRhdGlvblwiLCBcIlRoZSB0aGluZ3Mgc3RyYW5nZXJzIG1pZ2h0IGtub3cgeW91IGZvclwiLCBbQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlJlc3BvbnNpYmlsaXR5XCIsIFwiQmVpbmcgdHJ1c3RlZCBieSBvdGhlcnNcIiwgW0NhdGVnb3JpZXMuQ2FyZWVyXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJTdGFiaWxpdHlcIiwgXCJDb25maWRlbmNlIHRoYXQgbmV4dCB3ZWVrIHdpbGwgYmUgbGlrZSB0aGlzIHdlZWtcIiwgW0NhdGVnb3JpZXMuTG9uZ1Rlcm0sIENhdGVnb3JpZXMuRW52aXJvbm1lbnRdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlN0YXR1c1wiLCBcIlRoZSBoaWdoZXIgdXAgdGhlIGxhZGRlciB0aGUgYmV0dGVyXCIsIFtDYXRlZ29yaWVzLkNhcmVlcl0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiU3BvcnRcIiwgXCJDb21wZXRpdGl2ZSBleGVyY2lzZVwiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJWaXN1YWwgQXJ0cyBhbmQgQ3JhZnRzXCIsIFwiQ3JlYXRpbmcgYW5kIGFkbWlyaW5nXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIldlYWx0aFwiLCBcIkJleW9uZCBmaW5hbmNpYWwgc3RhYmlsaXR5XCIsIFtDYXRlZ29yaWVzLkNhcmVlcl0pLFxuXVxuXG5mdW5jdGlvbiB2YWx1ZXNfYnlfY2F0ZWdvcnkoY2F0ZWdvcmllczogQ2F0ZWdvcmllc1tdKTogc3RyaW5nW10ge1xuICAgIGxldCBzZXRfb2ZfY2F0ZWdvcmllcyA9IG5ldyBTZXQoY2F0ZWdvcmllcylcbiAgICBsZXQgc2hvdWxkX2luY2x1ZGUgPSAocHY6IFBlcnNvbmFsVmFsdWUpID0+IHB2LmNhdGVnb3JpZXMuZmlsdGVyKGkgPT4gc2V0X29mX2NhdGVnb3JpZXMuaGFzKGkpKS5sZW5ndGggPiAwXG5cbiAgICByZXR1cm4gQWxsVmFsdWVzLmZpbHRlcihzaG91bGRfaW5jbHVkZSkubWFwKHB2ID0+IHB2LnNob3J0TmFtZSlcbn1cblxubGV0IERlZmluaXRpb25zOiBhbnkgPSB7fVxuQWxsVmFsdWVzLmZvckVhY2gocHYgPT4geyBEZWZpbml0aW9uc1twdi5zaG9ydE5hbWVdID0gcHYuZGVzY3JpcHRpb24gfSlcblxuZnVuY3Rpb24gbWFya2Rvd25fYWxsX3ZhbHVlcygpOiBzdHJpbmcge1xuICAgIGxldCBieV9jYXRlZ29yeSA9IG5ldyBNYXA8Q2F0ZWdvcmllcywgUGVyc29uYWxWYWx1ZVtdPigpXG4gICAgQWxsVmFsdWVzLmZvckVhY2gocHYgPT4ge1xuICAgICAgICBwdi5jYXRlZ29yaWVzLmZvckVhY2goYyA9PiBieV9jYXRlZ29yeS5zZXQoYywgW10pKVxuICAgIH0pXG4gICAgQWxsVmFsdWVzLmZvckVhY2gocHYgPT4ge1xuICAgICAgICBwdi5jYXRlZ29yaWVzLmZvckVhY2goYyA9PiAoYnlfY2F0ZWdvcnkuZ2V0KGMpIGFzIFBlcnNvbmFsVmFsdWVbXSkucHVzaChwdikpXG4gICAgfSlcbiAgICBsZXQgcyA9IFwiXCJcbiAgICBmb3IgKGxldCBjYXQgb2YgWy4uLmJ5X2NhdGVnb3J5LmtleXMoKV0uc29ydCgpKSB7XG4gICAgICAgIGxldCBwdnMgPSBieV9jYXRlZ29yeS5nZXQoY2F0KSBhcyBQZXJzb25hbFZhbHVlW11cbiAgICAgICAgcyArPSBjYXRlZ29yeV9sb25nX25hbWUoY2F0KSArIFwiOlxcblxcblwiXG4gICAgICAgIHB2cy5tYXAocHYgPT4gcHYuc2hvcnROYW1lKS5zb3J0KCkuZm9yRWFjaChzaG9ydCA9PiBzICs9IFwiIC0gXCIgKyBzaG9ydCArIFwiOiBcIiArIERlZmluaXRpb25zW3Nob3J0XSArIFwiXFxuXCIpXG4gICAgICAgIHMgKz0gXCJcXG5cIlxuICAgIH1cbiAgICByZXR1cm4gc1xufVxuXG5mdW5jdGlvbiBjYXRlZ29yeV9sb25nX25hbWUoY2F0ZWdvcnk6IENhdGVnb3JpZXMpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAoY2F0ZWdvcnkpIHtcbiAgICAgICAgY2FzZSBDYXRlZ29yaWVzLkNhcmVlcjpcbiAgICAgICAgICAgIHJldHVybiBcIkNhcmVlclwiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5Ib2JiaWVzOlxuICAgICAgICAgICAgcmV0dXJuIFwiSG9iYmllc1wiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5FbnZpcm9ubWVudDpcbiAgICAgICAgICAgIHJldHVybiBcIkhvbWUgRW52aXJvbm1lbnRcIlxuICAgICAgICBjYXNlIENhdGVnb3JpZXMuTG9uZ1Rlcm06XG4gICAgICAgICAgICByZXR1cm4gXCJMb25nIFRlcm0gQXR0aXR1ZGVzXCJcbiAgICAgICAgY2FzZSBDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHM6XG4gICAgICAgICAgICByZXR1cm4gXCJSZWxhdGlvbnNoaXBzIGFuZCBGYWl0aFwiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5Db21tdW5pdHk6XG4gICAgICAgICAgICByZXR1cm4gXCJDb21tdW5pdHkgYW5kIEZhaXRoXCJcbiAgICB9XG59XG5cbmNsYXNzIFZhbHVlc0dhbWUge1xuICAgIHBvc2V0X2hpc3Rvcnk6IENvbXBhcmlzb25Qb3NldFtdID0gW11cbiAgICBjb21wYXJpc29uX2hpc3Rvcnk6IFtzdHJpbmcsIHN0cmluZ11bXSA9IFtdXG4gICAgcG9zZXQoKSB7XG4gICAgICAgIC8vIFRvcCBvbmUgaXMgYWx3YXlzIG1vc3QgcmVjZW50XG4gICAgICAgIHJldHVybiB0aGlzLnBvc2V0X2hpc3RvcnlbMF1cbiAgICB9XG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWF4X2ludGVyZXN0OiBudW1iZXIsIHJlYWRvbmx5IGNhdGVnb3JpZXM6IENhdGVnb3JpZXNbXSkge1xuICAgICAgICB0aGlzLnBvc2V0X2hpc3RvcnkucHVzaChuZXcgQ29tcGFyaXNvblBvc2V0KHZhbHVlc19ieV9jYXRlZ29yeShjYXRlZ29yaWVzKSkpXG4gICAgfVxuICAgIG9mX2ludGVyZXN0KCk6IFtib29sZWFuLCBzdHJpbmdbXV0ge1xuICAgICAgICBsZXQgcG9zZXQgPSB0aGlzLnBvc2V0KClcbiAgICAgICAgbGV0IHNvcnRlZCA9IHBvc2V0LmZ1bGx5X2RldGVybWluZWQoKVxuXG4gICAgICAgIGlmIChzb3J0ZWQgPCB0aGlzLm1heF9pbnRlcmVzdCkge1xuICAgICAgICAgICAgbGV0IG5leHRfbGV2ZWwgPSBwb3NldC5tYXhpbWFsX3RvcF9uKHNvcnRlZCArIDEpLmZpbHRlcih2ID0+ICFwb3NldC5pc19kZXRlcm1pbmVkKHYpKVxuXG5cblxuICAgICAgICAgICAgaWYgKG5leHRfbGV2ZWwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGxldCBmaXJzdF9jaG9pY2UgPSByRnJvbShuZXh0X2xldmVsLm1hcCh2ID0+IFt2LCAxXSkpXG4gICAgICAgICAgICAgICAgbGV0IHNlY29uZF9jaG9pY2UgPSByRnJvbShuZXh0X2xldmVsLmZpbHRlcih2ID0+IHYgIT0gZmlyc3RfY2hvaWNlKS5tYXAodiA9PiBbdiwgMV0pKVxuICAgICAgICAgICAgICAgIHJldHVybiBbdHJ1ZSwgW2ZpcnN0X2Nob2ljZSwgc2Vjb25kX2Nob2ljZV1dXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtmYWxzZSwgW11dXG4gICAgfVxuICAgIGNob29zZSh2MTogc3RyaW5nLCB2Mjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMucG9zZXRfaGlzdG9yeS51bnNoaWZ0KHRoaXMucG9zZXQoKS5hZGRfZ3JlYXRlcl90aGFuKHYxLCB2MikpXG4gICAgICAgIHRoaXMuY29tcGFyaXNvbl9oaXN0b3J5LnVuc2hpZnQoW3YxLCB2Ml0pXG4gICAgICAgIHRoaXMuc3VnZ2VzdCgpXG4gICAgfVxuICAgIHN1Z2dlc3QoKTogdm9pZCB7XG4gICAgICAgIGNsZWFyX2Nob2ljZV9kaXYoKVxuICAgICAgICBsZXQgcGFpciA9IHRoaXMub2ZfaW50ZXJlc3QoKVxuICAgICAgICBpZiAocGFpclswXSAhPSBmYWxzZSkge1xuICAgICAgICAgICAgZHJhd19jaG9pY2UocGFpclsxXVswXSwgcGFpclsxXVsxXSlcbiAgICAgICAgICAgIGRyYXdfZXN0aW1hdGUodGhpcy5wb3NldCgpLmVzdGltYXRlX3F1ZXN0aW9uc19yZW1haW5pbmcodGhpcy5tYXhfaW50ZXJlc3QpKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHJhd19hc3NpZ25tZW50KHRoaXMucG9zZXQoKS5wcmludF92YWxpZCgpLnJldmVyc2UoKS5zbGljZSgwLCB0aGlzLm1heF9pbnRlcmVzdCkpXG4gICAgICAgICAgICBoaWRlX2VzdGltYXRlKClcbiAgICAgICAgfVxuICAgICAgICBkcmF3X2hpc3RvcnkodGhpcy5jb21wYXJpc29uX2hpc3RvcnkpXG4gICAgfVxuICAgIHVuZG8oKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnBvc2V0X2hpc3RvcnkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdGhpcy5wb3NldF9oaXN0b3J5LnNoaWZ0KClcbiAgICAgICAgICAgIHRoaXMuY29tcGFyaXNvbl9oaXN0b3J5LnNoaWZ0KClcbiAgICAgICAgICAgIGhpZGVfYXNzaWdubWVudCgpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdWdnZXN0KClcbiAgICB9XG4gICAgcmVtYWluaW5nKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLnBvc2V0KCkuZXN0aW1hdGVfcXVlc3Rpb25zX3JlbWFpbmluZyh0aGlzLm1heF9pbnRlcmVzdClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFyX2hpc3RvcnkoKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGlzdG9yeVwiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gXCJcIlxufVxuXG5mdW5jdGlvbiBkcmF3X2hpc3RvcnkoY29tcGFyaXNvbnM6IFtzdHJpbmcsIHN0cmluZ11bXSkge1xuICAgIGNsZWFyX2hpc3RvcnkoKVxuXG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGlzdG9yeVwiKVxuICAgIGlmIChjb21wYXJpc29ucy5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgbGV0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBsZXQgdW5kb0J1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIilcbiAgICAgICAgdW5kb0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZXYgPT4ge1xuICAgICAgICAgICAgVkcudW5kbygpXG4gICAgICAgIH0pXG4gICAgICAgIHVuZG9CdXR0b24uY2xhc3NMaXN0LmFkZChcInVuZG8tYnV0dG9uXCIpXG4gICAgICAgIHVuZG9CdXR0b24uaW5uZXJUZXh0ID0gXCJVbmRvIExhc3RcIlxuICAgICAgICBsYWJlbC5hcHBlbmRDaGlsZCh1bmRvQnV0dG9uKVxuICAgICAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKFwidGhyZWUtd2lkZVwiKVxuICAgICAgICBkaXYhLmFwcGVuZENoaWxkKGxhYmVsKVxuICAgICAgICBjb21wYXJpc29ucy5mb3JFYWNoKGMgPT4ge1xuICAgICAgICAgICAgbGV0IGNwMSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgICAgIGxldCBjcDIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgICAgICBsZXQgY3AzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuXG4gICAgICAgICAgICBjcDEuaW5uZXJUZXh0ID0gY1swXVxuICAgICAgICAgICAgY3AyLnRleHRDb250ZW50ID0gXCI+XCJcbiAgICAgICAgICAgIGNwMy5pbm5lclRleHQgPSBjWzFdXG5cbiAgICAgICAgICAgIGRpdiEuYXBwZW5kQ2hpbGQoY3AxKVxuICAgICAgICAgICAgZGl2IS5hcHBlbmRDaGlsZChjcDIpXG4gICAgICAgICAgICBkaXYhLmFwcGVuZENoaWxkKGNwMylcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFyX2Nob2ljZV9kaXYoKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29tcGFyaXNvbnNcIilcbiAgICBkaXYhLmlubmVySFRNTCA9IFwiXCJcbn1cblxuXG5mdW5jdGlvbiBoaWRlX2VzdGltYXRlKCkge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVzdGltYXRlXCIpXG4gICAgZGl2IS5jbGFzc0xpc3QuYWRkKFwiaW52aXNpYmxlXCIpXG4gICAgZGl2IS5pbm5lckhUTUwgPSBcIlwiXG59XG5cbmZ1bmN0aW9uIGRyYXdfZXN0aW1hdGUoZXN0aW1hdGU6IG51bWJlcikge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVzdGltYXRlXCIpXG4gICAgZGl2IS5jbGFzc0xpc3QucmVtb3ZlKFwiaW52aXNpYmxlXCIpXG4gICAgbGV0IGVzdGltYXRlX3RleHQgPSBlc3RpbWF0ZS50b1N0cmluZygpXG4gICAgaWYgKGVzdGltYXRlIDwgMTApIHtcbiAgICAgICAgZXN0aW1hdGVfdGV4dCA9IFwiVW5kZXIgMTBcIlxuICAgIH1cbiAgICBkaXYhLmlubmVySFRNTCA9IGBFc3RpbWF0ZWQgcXVlc3Rpb25zIHJlbWFpbmluZzogJHtlc3RpbWF0ZV90ZXh0fWBcbn1cblxuXG5cbmZ1bmN0aW9uIGhpZGVfYXNzaWdubWVudCgpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhc3NpZ25tZW50XCIpXG4gICAgZGl2IS5jbGFzc0xpc3QuYWRkKFwiaW52aXNpYmxlXCIpXG4gICAgZGl2IS5pbm5lckhUTUwgPSBcIlwiXG59XG5cbmZ1bmN0aW9uIGRyYXdfYXNzaWdubWVudCh2YWx1ZXM6IHN0cmluZ1tdKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXNzaWdubWVudFwiKVxuICAgIGRpdiEuY2xhc3NMaXN0LnJlbW92ZShcImludmlzaWJsZVwiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gYDxoMT5Zb3VyIHRvcCB2YWx1ZXMsIHJhbmtlZDwvaDE+YCArIHZhbHVlcy5tYXAodiA9PiBgPGRpdiBjbGFzcz0ndmFsdWVSZXBvcnQnPjxoMj4ke3Z9PC9oMj48cD4keyhEZWZpbml0aW9ucyBhcyBhbnkpW3ZdfTwvcD48L2Rpdj5gKS5qb2luKFwiXFxuXCIpXG59XG5cbmZ1bmN0aW9uIHJGcm9tPFQ+KHdlaWdodGVkOiBbVCwgbnVtYmVyXVtdKTogVCB7XG4gICAgbGV0IHRvdGFsID0gKHdlaWdodGVkLm1hcCh2ID0+IHZbMV0pKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKVxuICAgIGxldCByID0gTWF0aC5yYW5kb20oKSAqIHRvdGFsXG4gICAgd2hpbGUgKHIgPiAwKSB7XG4gICAgICAgIGxldCBwb3BwZWQgPSB3ZWlnaHRlZC5wb3AoKSBhcyBbVCwgbnVtYmVyXVxuICAgICAgICByIC09IHBvcHBlZFsxXVxuICAgICAgICBpZiAociA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwb3BwZWRbMF1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTaG91bGQgbmV2ZXIgcmVhY2ggaGVyZVxuICAgIHRocm93IG5ldyBFcnJvcihcIldlaWdodGVkIGxpc3Qgd2FzIGVtcHR5XCIpXG59XG5cbmZ1bmN0aW9uIGRyYXdfY2hvaWNlKHYxOiBzdHJpbmcsIHYyOiBzdHJpbmcpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb21wYXJpc29uc1wiKVxuICAgIGZ1bmN0aW9uIGJ1dHRvbih2OiBzdHJpbmcsIHc6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgbGV0IGIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpXG4gICAgICAgIGIuaW5uZXJUZXh0ID0gdlxuICAgICAgICBiLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBldiA9PiB7XG4gICAgICAgICAgICBWRy5jaG9vc2UodiwgdylcbiAgICAgICAgfSlcbiAgICAgICAgYi5jbGFzc0xpc3QuYWRkKFwidmFsdWVzXCIpXG4gICAgICAgIHJldHVybiBiXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWluaV9sYWJlbCh2OiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIGxldCBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBkLmlubmVyVGV4dCA9IChEZWZpbml0aW9ucyBhcyBhbnkpW3ZdXG4gICAgICAgIGQuY2xhc3NMaXN0LmFkZChcImRlZmluaXRpb25cIilcbiAgICAgICAgcmV0dXJuIGRcbiAgICB9XG4gICAgbGV0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImgxXCIpXG4gICAgbGFiZWwuY2xhc3NMaXN0LmFkZChcImhlYWRlclwiKVxuICAgIGxhYmVsLmNsYXNzTGlzdC5hZGQoXCJ0d28td2lkZVwiKVxuICAgIGxhYmVsLmlubmVySFRNTCA9IFwiV2hpY2ggaXMgbW9yZSBpbXBvcnRhbnQ/XCJcbiAgICBjbGVhcl9jaG9pY2VfZGl2KClcbiAgICBkaXYhLmFwcGVuZENoaWxkKGxhYmVsKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQoYnV0dG9uKHYxLCB2MikpXG4gICAgZGl2IS5hcHBlbmRDaGlsZChidXR0b24odjIsIHYxKSlcbiAgICBkaXYhLmFwcGVuZENoaWxkKG1pbmlfbGFiZWwodjEpKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQobWluaV9sYWJlbCh2MikpXG59XG5cbmxldCBWRzogVmFsdWVzR2FtZVxuZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgbGV0IG1heF9hbmRfY2F0ZWdvcmllcyA9IHJlYWRfR0VUKClcbiAgICBsZXQgY2F0ZWdvcmllcyA9IG1heF9hbmRfY2F0ZWdvcmllc1sxXVxuICAgIGxldCBtYXhfdG9fZGV0ZXJtaW5lID0gbWF4X2FuZF9jYXRlZ29yaWVzWzBdXG4gICAgVkcgPSBuZXcgVmFsdWVzR2FtZShtYXhfdG9fZGV0ZXJtaW5lLCBjYXRlZ29yaWVzKVxuICAgIFZHLnN1Z2dlc3QoKVxufVxuXG5sZXQgcmVhZF9HRVQgPSBmdW5jdGlvbiAoKTogW251bWJlciwgQ2F0ZWdvcmllc1tdXSB7XG4gICAgbGV0IGJyZWFrX2F0X3F1ZXN0aW9uX21hcmsgPSB3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKS5zcGxpdCgvXFw/LylcbiAgICBsZXQgYWxsX2NhdGVnb3JpZXMgPSBPYmplY3Qua2V5cyhDYXRlZ29yaWVzKS5maWx0ZXIoayA9PiBOdW1iZXIuaXNOYU4oK2spKSBhcyBDYXRlZ29yaWVzW107XG4gICAgaWYgKGJyZWFrX2F0X3F1ZXN0aW9uX21hcmsubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmV0dXJuIFs1LCBhbGxfY2F0ZWdvcmllc11cbiAgICB9XG4gICAgbGV0IGluc3RydWN0aW9ucyA9IGJyZWFrX2F0X3F1ZXN0aW9uX21hcmtbMV1cbiAgICBsZXQgbWF4X3RvX2ZpbmQgPSA1XG4gICAgbGV0IGNhdGVnb3JpZXNfdG9faW5jbHVkZSA9IGFsbF9jYXRlZ29yaWVzXG4gICAgaW5zdHJ1Y3Rpb25zLnNwbGl0KFwiJlwiKS5tYXAocyA9PiB7XG4gICAgICAgIGxldCBwYXJ0cyA9IHMuc3BsaXQoXCI9XCIpXG4gICAgICAgIGlmIChwYXJ0c1swXSA9PSBcImluY2x1ZGVcIikge1xuICAgICAgICAgICAgY2F0ZWdvcmllc190b19pbmNsdWRlID0gW11cbiAgICAgICAgICAgIGxldCBjYXRzID0gcGFydHNbMV0uc3BsaXQoXCIsXCIpXG4gICAgICAgICAgICBjYXRzLmZvckVhY2gocmVxdWVzdGVkX2NhdCA9PiB7XG4gICAgICAgICAgICAgICAgYWxsX2NhdGVnb3JpZXMuZm9yRWFjaChyZWFsX2NhdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWFsX2NhdCA9PSByZXF1ZXN0ZWRfY2F0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzX3RvX2luY2x1ZGUucHVzaChyZWFsX2NhdClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0c1swXSA9PSBcIm1heFwiKSB7XG4gICAgICAgICAgICBtYXhfdG9fZmluZCA9IHBhcnNlSW50KHBhcnRzWzFdKVxuICAgICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gW21heF90b19maW5kLCBjYXRlZ29yaWVzX3RvX2luY2x1ZGVdXG59Il19