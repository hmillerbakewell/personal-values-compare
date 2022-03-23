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
    new PersonalValue("Helping Others", "Working to help those around you", [Categories.Career, Categories.Community]),
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
    new PersonalValue("Status", "The higher up the ladder the better", [Categories.Career, Categories.Community]),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21wYXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFNLGVBQWU7SUFFakIsWUFBcUIsV0FBcUIsRUFBRSxZQUFxQyxJQUFJLEdBQUcsRUFBRTtRQUFyRSxnQkFBVyxHQUFYLFdBQVcsQ0FBVTtRQUQxQyxjQUFTLEdBQTRCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFMUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUNyQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNsRSxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFBO1NBQ0w7SUFDTCxDQUFDO0lBQ0QsVUFBVSxDQUFDLEVBQVUsRUFBRSxFQUFVO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBZSxDQUFBO0lBQ25FLENBQUM7SUFDRCxTQUFTLENBQUMsRUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFDRCxT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QVMsRUFBRTtZQUN2QixxQkFBcUIsR0FBRyxFQUFFLENBQUE7WUFDMUIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFO2dCQUN6QixjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUM5QixJQUFJLFFBQVEsSUFBSSxhQUFhLEVBQUU7d0JBQzNCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtxQkFDdkM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUE7WUFDTixDQUFDLENBQUMsQ0FBQTtTQUNMO1FBQ0QsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFO1lBQ25CLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FDbkM7SUFDTCxDQUFDLENBQUMsQ0FBQTtJQUNGLE9BQU8sQ0FBQyxXQUFXLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtBQUMvQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBDb21wYXJpc29uUG9zZXQge1xuICAgIG9yZGVyaW5nczogTWFwPHN0cmluZywgQ29tcGFyaXNvbj4gPSBuZXcgTWFwKClcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBodW1hblZhbHVlczogc3RyaW5nW10sIG9yZGVyaW5nczogTWFwPHN0cmluZywgQ29tcGFyaXNvbj4gPSBuZXcgTWFwKCkpIHtcbiAgICAgICAgdGhpcy5vcmRlcmluZ3MgPSBjb3B5X21hcChvcmRlcmluZ3MpXG4gICAgICAgIGlmIChbLi4ub3JkZXJpbmdzLnZhbHVlcygpXS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5odW1hblZhbHVlcy5tYXAodjEgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaHVtYW5WYWx1ZXMubWFwKHYyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcmRlcmluZ3Muc2V0KGNvbWJpbmVfdmFsdWVzKHYxLCB2MiksIENvbXBhcmlzb24uVW5rbm93bilcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb21wYXJpc29uKHYxOiBzdHJpbmcsIHYyOiBzdHJpbmcpOiBDb21wYXJpc29uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3JkZXJpbmdzLmdldChjb21iaW5lX3ZhbHVlcyh2MSwgdjIpKSBhcyBDb21wYXJpc29uXG4gICAgfVxuICAgIGFsbF9hYm92ZSh2MTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5odW1hblZhbHVlcy5maWx0ZXIodjIgPT4gdGhpcy5jb21wYXJpc29uKHYyLCB2MSkgPT0gQ29tcGFyaXNvbi5HcmVhdGVyVGhhbilcbiAgICB9XG4gICAgYWxsX2JlbG93KHYxOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2MiA9PiB0aGlzLmNvbXBhcmlzb24odjEsIHYyKSA9PSBDb21wYXJpc29uLkdyZWF0ZXJUaGFuKVxuICAgIH1cbiAgICBhZGRfZ3JlYXRlcl90aGFuKGhpZ2hlcjogc3RyaW5nLCBsb3dlcjogc3RyaW5nKTogQ29tcGFyaXNvblBvc2V0IHtcbiAgICAgICAgbGV0IGhpZ2hlcl9hbmRfYWJvdmUgPSBbaGlnaGVyXS5jb25jYXQodGhpcy5hbGxfYWJvdmUoaGlnaGVyKSlcbiAgICAgICAgbGV0IGxvd2VyX2FuZF9iZWxvdyA9IFtsb3dlcl0uY29uY2F0KHRoaXMuYWxsX2JlbG93KGxvd2VyKSlcbiAgICAgICAgbGV0IG8gPSBjb3B5X21hcCh0aGlzLm9yZGVyaW5ncylcbiAgICAgICAgaGlnaGVyX2FuZF9hYm92ZS5tYXAodjEgPT4ge1xuICAgICAgICAgICAgbG93ZXJfYW5kX2JlbG93Lm1hcCh2MiA9PiB7XG4gICAgICAgICAgICAgICAgby5zZXQoY29tYmluZV92YWx1ZXModjEsIHYyKSwgQ29tcGFyaXNvbi5HcmVhdGVyVGhhbilcbiAgICAgICAgICAgICAgICBvLnNldChjb21iaW5lX3ZhbHVlcyh2MiwgdjEpLCBDb21wYXJpc29uLkxlc3NUaGFuT3JFcXVhbClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cbiAgICAgICAgcmV0dXJuIG5ldyBDb21wYXJpc29uUG9zZXQodGhpcy5odW1hblZhbHVlcywgbylcbiAgICB9XG5cbiAgICBzdXByZW11bSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgbGV0IGFib3ZlID0gdGhpcy5hbGxfYWJvdmUodmFsdWUpXG4gICAgICAgIGlmIChhYm92ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdXByZW11bShhYm92ZVswXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG5cbiAgICBwcmludF92YWxpZCgpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBwcmludF9hc3NpZ25hdGlvbihhc3NpZ25fb3JkZXJpbmcodGhpcykpXG4gICAgfVxuXG4gICAgbnVtX2NvbXBvbmVudHMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3VwcmVtYSgpLmxlbmd0aFxuICAgIH1cblxuICAgIHN1cHJlbWEoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gWy4uLiBuZXcgU2V0KHRoaXMuaHVtYW5WYWx1ZXMubWFwKHYgPT4gdGhpcy5zdXByZW11bSh2KSkpXVxuICAgIH1cblxuICAgIGVzdGltYXRlX3F1ZXN0aW9uc19yZW1haW5pbmcoZGV0ZXJtaW5lX3RvcF9uOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICAvLyBzdHJhdGVneTogYWNjdXJhdGUgbWVhc3VyZSBmb3IgdGhlIHRvcCBsZXZlbFxuICAgICAgICAvLyB0aGVuIGEgaGV1cmlzdGljIGZvciB0aGUgcmVzdFxuXG4gICAgICAgIGxldCBjb21wbGV0ZWQgPSB0aGlzLmZ1bGx5X2RldGVybWluZWQoKVxuXG4gICAgICAgIGxldCBuZXh0X2xldmVsID0gdGhpcy5tYXhpbWFsX3RvcF9uKGNvbXBsZXRlZCArIDEpLmxlbmd0aCAtIGNvbXBsZXRlZFxuXG4gICAgICAgIC8vIEhvdyBtYW55IHF1ZXN0aW9ucyB0byBjb25uZWN0IGFsbCBjb21wb25lbnRzLCB0aGVuIGZ1bGx5IGRldGVybWluZSB0b3AgblxuICAgICAgICBsZXQgcXVlc3Rpb25zX3RvX2xpbmtfY29tcG9uZW50cyA9IG5leHRfbGV2ZWwgLSAxXG5cbiAgICAgICAgLy8gTm93IHdvcmsgb3V0IGhvdyBtYW55IHF1ZXN0aW9ucyBvbmNlIHdlIGhhdmUgbGlua2VkIGFsbCBjb21wb25lbnRzXG5cbiAgICAgICAgLy8gTW9zdCBsaWtlbHkgc2NlbmFyaW8gaXMgYmluYXJ5IHRyZWVcbiAgICAgICAgbGV0IHJlbWFpbmluZyA9IE1hdGgubWF4KGRldGVybWluZV90b3BfbiAtIGNvbXBsZXRlZCwgMSlcbiAgICAgICAgbGV0IHF1ZXN0aW9uc190b19maWxsX3RvcF9zcG90c190eXBpY2FsID0gcmVtYWluaW5nICogKHJlbWFpbmluZyAtIDEpIC8gMlxuXG4gICAgICAgIGxldCBlc3RpbWF0ZSA9IHF1ZXN0aW9uc190b19saW5rX2NvbXBvbmVudHMgKyAxLjUgKiBxdWVzdGlvbnNfdG9fZmlsbF90b3Bfc3BvdHNfdHlwaWNhbFxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihlc3RpbWF0ZSkgKyAzIC8vIHBsdXMgMyB0byBiZSBvbiB0aGUgc2FmZSBzaWRlXG4gICAgfVxuXG4gICAgaXNfZGV0ZXJtaW5lZCh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIC8vIEZ1bGx5IGRldGVybWluZWQgdmFsdWVzIGhhdmUgY29tcGFyaXNvbnMga25vd24gZXZlcnl3aGVyZSwgZXhjZXB0IGFnYWluc3QgdGhlbXNlbHZlc1xuICAgICAgICByZXR1cm4gdGhpcy5odW1hblZhbHVlcy5maWx0ZXIodjIgPT4gdGhpcy5jb21wYXJpc29uKHZhbHVlLCB2MikgPT0gQ29tcGFyaXNvbi5Vbmtub3duKS5sZW5ndGggPT0gMVxuICAgIH1cblxuICAgIGZ1bGx5X2RldGVybWluZWQoKTogbnVtYmVyIHtcbiAgICAgICAgLy8gTnVtYmVyIHdpdGggbm8gdW5rbm93biBlbnRyaWVzIChiZXNpZGUgdGhlbXNlbHZlcylcbiAgICAgICAgcmV0dXJuIHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYgPT4gdGhpcy5pc19kZXRlcm1pbmVkKHYpKS5sZW5ndGhcbiAgICB9XG5cbiAgICBtYXhpbWFsX3RvcF9uKG46IG51bWJlcik6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYgPT4gdGhpcy5hbGxfYWJvdmUodikubGVuZ3RoIDwgbilcbiAgICB9XG5cbiAgICBfbWF4X3JhdGluZyh2YWx1ZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgLy8gMC1pbmRleGVkLCAwIG1lYW5zIGRlZmluaXRlbHkgYXQgdGhlIHRvcFxuICAgICAgICAvLyByYXRpbmcgb2YgbiBtZWFucyB0aGVyZSBhcmUgbiBkZWZpbml0ZWx5IGFib3ZlIHRoaXNcbiAgICAgICAgcmV0dXJuIHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYyID0+IHRoaXMuY29tcGFyaXNvbih2MiwgdmFsdWUpID09IENvbXBhcmlzb24uR3JlYXRlclRoYW4pLmxlbmd0aFxuICAgIH1cblxuICAgIHJhdGluZ3MobWF4OiBudW1iZXIpOiBSYXRpbmdJbmZvcm1hdGlvbltdIHtcblxuICAgICAgICBsZXQgcXVhbGlmeWluZyA9IHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYgPT4gdGhpcy5fbWF4X3JhdGluZyh2KSA8IG1heClcblxuICAgICAgICByZXR1cm4gcXVhbGlmeWluZy5tYXAodiA9PiBuZXcgUmF0aW5nSW5mb3JtYXRpb24oXG4gICAgICAgICAgICB2LFxuICAgICAgICAgICAgdGhpcy5fbWF4X3JhdGluZyh2KSxcbiAgICAgICAgICAgIHF1YWxpZnlpbmcuZmlsdGVyKHcgPT4gdGhpcy5jb21wYXJpc29uKHYsIHcpID09IENvbXBhcmlzb24uVW5rbm93biAmJiAodiAhPSB3KSlcbiAgICAgICAgKSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNvcHlfbWFwPEssIFY+KG9yZGVyaW5nOiBNYXA8SywgVj4pOiBNYXA8SywgVj4ge1xuICAgIGxldCBvOiBNYXA8SywgVj4gPSBuZXcgTWFwKCk7XG4gICAgWy4uLm9yZGVyaW5nLmtleXMoKV0ubWFwKGsgPT4ge1xuICAgICAgICBvLnNldChrLCBvcmRlcmluZy5nZXQoaykgYXMgVilcbiAgICB9KVxuICAgIHJldHVybiBvXG59XG5cbmNsYXNzIFJhdGluZ0luZm9ybWF0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSB2YWx1ZTogc3RyaW5nLCByZWFkb25seSByYXRpbmc6IG51bWJlciwgcmVhZG9ubHkgdW5rbm93bl9jb21wYXJpc29uczogc3RyaW5nW10pIHsgfVxufVxuXG5mdW5jdGlvbiBhc3NpZ25fb3JkZXJpbmcocG9zZXQ6IENvbXBhcmlzb25Qb3NldCk6IE1hcDxzdHJpbmcsIG51bWJlcj4ge1xuICAgIGxldCBhc3NpZ25hdGlvbiA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KClcbiAgICBwb3NldC5odW1hblZhbHVlcy5tYXAodmFsdWUgPT4gYXNzaWduYXRpb24uc2V0KHZhbHVlLCBNYXRoLnJhbmRvbSgpKSlcbiAgICBsZXQgbWlzc21hdGNoID0gZnVuY3Rpb24gKCk6IEJvb2xlYW4ge1xuICAgICAgICAvLyBOZWVkIHRvIGNoZWNrIHRoYXQgaWYgYSA+IGIgaW4gdGhlIHBvc2V0IHRoZW4gYSA+IGIgaW4gdGhlIGFzc2lnbmF0aW9uXG4gICAgICAgIGZvciAobGV0IHZhbHVlIG9mIHBvc2V0Lmh1bWFuVmFsdWVzKSB7XG4gICAgICAgICAgICBsZXQgYmVsb3cgPSBwb3NldC5hbGxfYmVsb3codmFsdWUpXG4gICAgICAgICAgICBsZXQgYmlnZ2VzdF9iZWxvdyA9IE1hdGgubWF4KC4uLmJlbG93Lm1hcCh2ID0+IGFzc2lnbmF0aW9uLmdldCh2KSBhcyBDb21wYXJpc29uKSlcbiAgICAgICAgICAgIGlmIChhc3NpZ25hdGlvbi5nZXQodmFsdWUpIGFzIENvbXBhcmlzb24gPD0gYmlnZ2VzdF9iZWxvdykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIGxldCBjb3VudGVyID0gMFxuICAgIGxldCBtYXggPSAxMDBcbiAgICB3aGlsZSAobWlzc21hdGNoKCkgJiYgY291bnRlciA8IG1heCkge1xuICAgICAgICBmb3IgKGxldCB2YWx1ZSBvZiBwb3NldC5odW1hblZhbHVlcykge1xuICAgICAgICAgICAgbGV0IGJlbG93ID0gcG9zZXQuYWxsX2JlbG93KHZhbHVlKVxuICAgICAgICAgICAgbGV0IGJpZ2dlc3RfYmVsb3cgPSBNYXRoLm1heCguLi5iZWxvdy5tYXAodiA9PiBhc3NpZ25hdGlvbi5nZXQodikgYXMgbnVtYmVyKSlcbiAgICAgICAgICAgIGlmIChhc3NpZ25hdGlvbi5nZXQodmFsdWUpIGFzIG51bWJlciA8PSBiaWdnZXN0X2JlbG93KSB7XG4gICAgICAgICAgICAgICAgYXNzaWduYXRpb24uc2V0KHZhbHVlLCBiaWdnZXN0X2JlbG93ICsgKDEgLSBiaWdnZXN0X2JlbG93KSAqIE1hdGgucmFuZG9tKCkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY291bnRlcisrXG4gICAgfVxuICAgIGlmIChjb3VudGVyID09IG1heCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaW1lb3V0XCIpXG4gICAgfVxuICAgIHJldHVybiBhc3NpZ25hdGlvblxufVxuXG5mdW5jdGlvbiBwcmludF9hc3NpZ25hdGlvbihhc3NpZ25hdGlvbjogTWFwPHN0cmluZywgbnVtYmVyPik6IHN0cmluZ1tdIHtcbiAgICBsZXQgdmFsdWVzID0gWy4uLmFzc2lnbmF0aW9uLmtleXMoKV0uc29ydCgoYSwgYikgPT4gKGFzc2lnbmF0aW9uLmdldChhKSBhcyBudW1iZXIpIC0gKGFzc2lnbmF0aW9uLmdldChiKSBhcyBudW1iZXIpKVxuICAgIHJldHVybiB2YWx1ZXNcbn1cblxuZnVuY3Rpb24gY29tYmluZV92YWx1ZXModjE6IHN0cmluZywgdjI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHYxICsgXCI6OlwiICsgdjJcbn1cblxuZW51bSBDb21wYXJpc29uIHtcbiAgICBHcmVhdGVyVGhhbiA9IDEsIExlc3NUaGFuT3JFcXVhbCA9IC0xLCBVbmtub3duID0gMFxufVxuXG5mdW5jdGlvbiBmbGlwX2NvbXBhcmlzb24oY29tcGFyaXNvbjogQ29tcGFyaXNvbik6IENvbXBhcmlzb24ge1xuICAgIHN3aXRjaCAoY29tcGFyaXNvbikge1xuICAgICAgICBjYXNlIENvbXBhcmlzb24uR3JlYXRlclRoYW46XG4gICAgICAgICAgICByZXR1cm4gQ29tcGFyaXNvbi5MZXNzVGhhbk9yRXF1YWxcbiAgICAgICAgY2FzZSBDb21wYXJpc29uLkxlc3NUaGFuT3JFcXVhbDpcbiAgICAgICAgICAgIHJldHVybiBDb21wYXJpc29uLkdyZWF0ZXJUaGFuXG4gICAgICAgIGNhc2UgQ29tcGFyaXNvbi5Vbmtub3duOlxuICAgICAgICAgICAgcmV0dXJuIENvbXBhcmlzb24uVW5rbm93blxuICAgIH1cbn1cblxuXG5cbmVudW0gQ2F0ZWdvcmllcyB7XG4gICAgUmVsYXRpb25zaGlwcyA9IFwiUmVsYXRpb25zaGlwc1wiLFxuICAgIEVudmlyb25tZW50ID0gXCJFbnZpcm9ubWVudFwiLFxuICAgIEhvYmJpZXMgPSBcIkhvYmJpZXNcIixcbiAgICBDYXJlZXIgPSBcIkNhcmVlclwiLFxuICAgIExvbmdUZXJtID0gXCJMb25nVGVybVwiLFxuICAgIENvbW11bml0eSA9IFwiQ29tbXVuaXR5XCJcbn1cblxuXG5jbGFzcyBQZXJzb25hbFZhbHVlIHtcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBzaG9ydE5hbWU6IHN0cmluZywgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZywgcmVhZG9ubHkgY2F0ZWdvcmllczogQ2F0ZWdvcmllc1tdKSB7IH1cbn1cblxuXG5sZXQgQWxsVmFsdWVzOiBQZXJzb25hbFZhbHVlW10gPSBbXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJBY2tub3dsZWRnZW1lbnRcIiwgXCJIYXZlIHlvdXIgb3BpbmlvbnMgaGVhcmRcIiwgW0NhdGVnb3JpZXMuQ2FyZWVyXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJBZHZlbnR1cmVcIiwgXCJGaW5kaW5nIG5ldyBleGNpdGVtZW50c1wiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQXBwZWFyYW5jZVwiLCBcIkhvdyB5b3UgbG9va1wiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJCdXN0bGVcIiwgXCJBbHdheXMgaGF2aW5nIHNvbWV0aGluZyBnb2luZyBvblwiLCBbQ2F0ZWdvcmllcy5FbnZpcm9ubWVudF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ2hhbGxlbmdlXCIsIFwiUHVzaGluZyB5b3Vyc2VsZiwgcmVnYXJkbGVzcyBvZiB0aGUgZ29hbFwiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ29tbXVuaXR5XCIsIFwiQmVpbmcgcGFydCBvZiBhIGxhcmdlIGdyb3VwXCIsIFtDYXRlZ29yaWVzLkNvbW11bml0eV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ3VyaW9zaXR5XCIsIFwiRW5jb3VudGVyaW5nIG5ldyBpZGVhc1wiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ29va2luZ1wiLCBcIlByZXBhcmluZyBmb29kIGluIHlvdXIgb3duIGhvbWVcIiwgW0NhdGVnb3JpZXMuRW52aXJvbm1lbnQsIENhdGVnb3JpZXMuSG9iYmllc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRGFuY2luZ1wiLCBcIlN0cnVjdHVyZWQgb3IgZG9pbmcgeW91ciBvd24gdGhpbmdcIiwgW0NhdGVnb3JpZXMuSG9iYmllc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRXhlcmNpc2VcIiwgXCJUaGluZ3MgeW91IGRvIHRvIGtlZXAgZml0LCBidXQgbm90IGNvbXBldGl0aXZlXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkZhaXRoXCIsIFwiQ29ubmVjdGlvbiB0byBzb21ldGhpbmcgYmV5b25kIGh1bWFuaXR5XCIsIFtDYXRlZ29yaWVzLkNvbW11bml0eV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRmFtaWx5XCIsIFwiUmVndWxhciBjb25uZWN0aW9uIHdpdGggZmFtaWx5XCIsIFtDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHMsIENhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJGcmVzaCBBaXJcIiwgXCJBY2Nlc3MgdG8gYSBjbGVhbiBlbnZpcm9ubWVudFwiLCBbQ2F0ZWdvcmllcy5FbnZpcm9ubWVudF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRnJpZW5kc2hpcFwiLCBcIkRlZXAgcmVsYXRpb25zaGlwcyB3aXRoaW4gYSBzbWFsbCBncm91cFwiLCBbQ2F0ZWdvcmllcy5SZWxhdGlvbnNoaXBzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJHYW1lc1wiLCBcIkJvYXJkZ2FtZXMsIGNhcmRzLCBjb21wdXRlciBnYW1lcywgZXRjLlwiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJHYXJkZW5pbmdcIiwgXCJBIHBsYWNlIGFuZCB0aGUgdGltZSB0byBncm93IHBsYW50c1wiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzLCBDYXRlZ29yaWVzLkVudmlyb25tZW50XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJHaXZpbmcgR2lmdHNcIiwgXCJGaW5kaW5nIG9yIG1ha2luZyBnaWZ0cyBmb3Igb3RoZXJzXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXMsIENhdGVnb3JpZXMuUmVsYXRpb25zaGlwc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiR3Jvd3RoXCIsIFwiS25vd2luZyB5b3UgYXJlIGNoYW5naW5nIGFuZCBhZGFwdGluZ1wiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybSwgQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkhlbHBpbmcgT3RoZXJzXCIsIFwiV29ya2luZyB0byBoZWxwIHRob3NlIGFyb3VuZCB5b3VcIiwgW0NhdGVnb3JpZXMuQ2FyZWVyLCBDYXRlZ29yaWVzLkNvbW11bml0eV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiTGVhZGVyc2hpcFwiLCBcIlBlb3BsZSBsb29rIHRvIHlvdSBmb3IgZ3VpZGFuY2VcIiwgW0NhdGVnb3JpZXMuQ2FyZWVyXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJMZWFybmluZ1wiLCBcIkFtYXNzaW5nIGtub3dsZWRnZSBhbmQgc2tpbGxzXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkxvdmVcIiwgXCJGaW5kaW5nIHBlb3BsZSB0byBzaGFyZSB5b3VyIGhlYXJ0IHdpdGhcIiwgW0NhdGVnb3JpZXMuUmVsYXRpb25zaGlwc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUGVhY2VcIiwgXCJDYWxtLCB0cmFucXVpbGxpdHksIHNpbGVuY2VcIiwgW0NhdGVnb3JpZXMuRW52aXJvbm1lbnRdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBldHNcIiwgXCJIYXZpbmcgcGV0cyBhdCBob21lXCIsIFtDYXRlZ29yaWVzLkVudmlyb25tZW50LCBDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBlcmZvcm1pbmcgQXJ0c1wiLCBcIk11c2ljLCB0aGVhdHJlLCBldGMuXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBvbGl0aWNzXCIsIFwiU2VydmluZyB0aGUgcHVibGljXCIsIFtDYXRlZ29yaWVzLkNhcmVlcl0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUGh5c2ljYWwgSW5kZXBlbmRlbmNlXCIsIFwiTGl2aW5nIHdpdGhvdXQgcm91dGluZSBhc3Npc3RhbmNlXCIsIFtDYXRlZ29yaWVzLkVudmlyb25tZW50XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJRdWFsaXR5IFRpbWVcIiwgXCJCZWluZyB3aXRoIGZyaWVuZHMgb3IgbG92ZWQgb25lcywgbm8gbWF0dGVyIHRoZSBhY3Rpdml0eVwiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJMaXRlcmF0dXJlXCIsIFwiUmVhZGluZyBhbmQgd3JpdGluZ1wiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJSZWxpZ2lvblwiLCBcIlRoZSByb3V0aW5lLCBzdHJ1Y3R1cmUsIGFuZCBjb21tdW5pdHksIGFzIG9wcG9zZWQgdG8gRmFpdGhcIiwgW0NhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJSZXB1dGF0aW9uXCIsIFwiVGhlIHRoaW5ncyBzdHJhbmdlcnMgbWlnaHQga25vdyB5b3UgZm9yXCIsIFtDYXRlZ29yaWVzLkNhcmVlcl0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUmVzcG9uc2liaWxpdHlcIiwgXCJCZWluZyB0cnVzdGVkIGJ5IG90aGVyc1wiLCBbQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlN0YWJpbGl0eVwiLCBcIkNvbmZpZGVuY2UgdGhhdCBuZXh0IHdlZWsgd2lsbCBiZSBsaWtlIHRoaXMgd2Vla1wiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybSwgQ2F0ZWdvcmllcy5FbnZpcm9ubWVudF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiU3RhdHVzXCIsIFwiVGhlIGhpZ2hlciB1cCB0aGUgbGFkZGVyIHRoZSBiZXR0ZXJcIiwgW0NhdGVnb3JpZXMuQ2FyZWVyLCBDYXRlZ29yaWVzLkNvbW11bml0eV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiU3BvcnRcIiwgXCJDb21wZXRpdGl2ZSBleGVyY2lzZVwiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJWaXN1YWwgQXJ0cyBhbmQgQ3JhZnRzXCIsIFwiQ3JlYXRpbmcgYW5kIGFkbWlyaW5nXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIldlYWx0aFwiLCBcIkJleW9uZCBmaW5hbmNpYWwgc3RhYmlsaXR5XCIsIFtDYXRlZ29yaWVzLkNhcmVlcl0pLFxuXVxuXG5mdW5jdGlvbiB2YWx1ZXNfYnlfY2F0ZWdvcnkoY2F0ZWdvcmllczogQ2F0ZWdvcmllc1tdKTogc3RyaW5nW10ge1xuICAgIGxldCBzZXRfb2ZfY2F0ZWdvcmllcyA9IG5ldyBTZXQoY2F0ZWdvcmllcylcbiAgICBsZXQgc2hvdWxkX2luY2x1ZGUgPSAocHY6IFBlcnNvbmFsVmFsdWUpID0+IHB2LmNhdGVnb3JpZXMuZmlsdGVyKGkgPT4gc2V0X29mX2NhdGVnb3JpZXMuaGFzKGkpKS5sZW5ndGggPiAwXG5cbiAgICByZXR1cm4gQWxsVmFsdWVzLmZpbHRlcihzaG91bGRfaW5jbHVkZSkubWFwKHB2ID0+IHB2LnNob3J0TmFtZSlcbn1cblxubGV0IERlZmluaXRpb25zOiBhbnkgPSB7fVxuQWxsVmFsdWVzLmZvckVhY2gocHYgPT4geyBEZWZpbml0aW9uc1twdi5zaG9ydE5hbWVdID0gcHYuZGVzY3JpcHRpb24gfSlcblxuZnVuY3Rpb24gbWFya2Rvd25fYWxsX3ZhbHVlcygpOiBzdHJpbmcge1xuICAgIGxldCBieV9jYXRlZ29yeSA9IG5ldyBNYXA8Q2F0ZWdvcmllcywgUGVyc29uYWxWYWx1ZVtdPigpXG4gICAgQWxsVmFsdWVzLmZvckVhY2gocHYgPT4ge1xuICAgICAgICBwdi5jYXRlZ29yaWVzLmZvckVhY2goYyA9PiBieV9jYXRlZ29yeS5zZXQoYywgW10pKVxuICAgIH0pXG4gICAgQWxsVmFsdWVzLmZvckVhY2gocHYgPT4ge1xuICAgICAgICBwdi5jYXRlZ29yaWVzLmZvckVhY2goYyA9PiAoYnlfY2F0ZWdvcnkuZ2V0KGMpIGFzIFBlcnNvbmFsVmFsdWVbXSkucHVzaChwdikpXG4gICAgfSlcbiAgICBsZXQgcyA9IFwiXCJcbiAgICBmb3IgKGxldCBjYXQgb2YgWy4uLmJ5X2NhdGVnb3J5LmtleXMoKV0uc29ydCgpKSB7XG4gICAgICAgIGxldCBwdnMgPSBieV9jYXRlZ29yeS5nZXQoY2F0KSBhcyBQZXJzb25hbFZhbHVlW11cbiAgICAgICAgcyArPSBjYXRlZ29yeV9sb25nX25hbWUoY2F0KSArIFwiOlxcblxcblwiXG4gICAgICAgIHB2cy5tYXAocHYgPT4gcHYuc2hvcnROYW1lKS5zb3J0KCkuZm9yRWFjaChzaG9ydCA9PiBzICs9IFwiIC0gXCIgKyBzaG9ydCArIFwiOiBcIiArIERlZmluaXRpb25zW3Nob3J0XSArIFwiXFxuXCIpXG4gICAgICAgIHMgKz0gXCJcXG5cIlxuICAgIH1cbiAgICByZXR1cm4gc1xufVxuXG5mdW5jdGlvbiBjYXRlZ29yeV9sb25nX25hbWUoY2F0ZWdvcnk6IENhdGVnb3JpZXMpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAoY2F0ZWdvcnkpIHtcbiAgICAgICAgY2FzZSBDYXRlZ29yaWVzLkNhcmVlcjpcbiAgICAgICAgICAgIHJldHVybiBcIkNhcmVlclwiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5Ib2JiaWVzOlxuICAgICAgICAgICAgcmV0dXJuIFwiSG9iYmllc1wiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5FbnZpcm9ubWVudDpcbiAgICAgICAgICAgIHJldHVybiBcIkhvbWUgRW52aXJvbm1lbnRcIlxuICAgICAgICBjYXNlIENhdGVnb3JpZXMuTG9uZ1Rlcm06XG4gICAgICAgICAgICByZXR1cm4gXCJMb25nIFRlcm0gQXR0aXR1ZGVzXCJcbiAgICAgICAgY2FzZSBDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHM6XG4gICAgICAgICAgICByZXR1cm4gXCJSZWxhdGlvbnNoaXBzIGFuZCBGYWl0aFwiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5Db21tdW5pdHk6XG4gICAgICAgICAgICByZXR1cm4gXCJDb21tdW5pdHkgYW5kIEZhaXRoXCJcbiAgICB9XG59XG5cbmNsYXNzIFZhbHVlc0dhbWUge1xuICAgIHBvc2V0X2hpc3Rvcnk6IENvbXBhcmlzb25Qb3NldFtdID0gW11cbiAgICBjb21wYXJpc29uX2hpc3Rvcnk6IFtzdHJpbmcsIHN0cmluZ11bXSA9IFtdXG4gICAgcG9zZXQoKSB7XG4gICAgICAgIC8vIFRvcCBvbmUgaXMgYWx3YXlzIG1vc3QgcmVjZW50XG4gICAgICAgIHJldHVybiB0aGlzLnBvc2V0X2hpc3RvcnlbMF1cbiAgICB9XG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWF4X2ludGVyZXN0OiBudW1iZXIsIHJlYWRvbmx5IGNhdGVnb3JpZXM6IENhdGVnb3JpZXNbXSkge1xuICAgICAgICB0aGlzLnBvc2V0X2hpc3RvcnkucHVzaChuZXcgQ29tcGFyaXNvblBvc2V0KHZhbHVlc19ieV9jYXRlZ29yeShjYXRlZ29yaWVzKSkpXG4gICAgfVxuICAgIG9mX2ludGVyZXN0KCk6IFtib29sZWFuLCBzdHJpbmdbXV0ge1xuICAgICAgICBsZXQgcG9zZXQgPSB0aGlzLnBvc2V0KClcbiAgICAgICAgbGV0IHNvcnRlZCA9IHBvc2V0LmZ1bGx5X2RldGVybWluZWQoKVxuXG4gICAgICAgIGlmIChzb3J0ZWQgPCB0aGlzLm1heF9pbnRlcmVzdCkge1xuICAgICAgICAgICAgbGV0IG5leHRfbGV2ZWwgPSBwb3NldC5tYXhpbWFsX3RvcF9uKHNvcnRlZCArIDEpLmZpbHRlcih2ID0+ICFwb3NldC5pc19kZXRlcm1pbmVkKHYpKVxuXG5cblxuICAgICAgICAgICAgaWYgKG5leHRfbGV2ZWwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGxldCBmaXJzdF9jaG9pY2UgPSByRnJvbShuZXh0X2xldmVsLm1hcCh2ID0+IFt2LCAxXSkpXG4gICAgICAgICAgICAgICAgbGV0IHNlY29uZF9jaG9pY2UgPSByRnJvbShuZXh0X2xldmVsLmZpbHRlcih2ID0+IHYgIT0gZmlyc3RfY2hvaWNlKS5tYXAodiA9PiBbdiwgMV0pKVxuICAgICAgICAgICAgICAgIHJldHVybiBbdHJ1ZSwgW2ZpcnN0X2Nob2ljZSwgc2Vjb25kX2Nob2ljZV1dXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtmYWxzZSwgW11dXG4gICAgfVxuICAgIGNob29zZSh2MTogc3RyaW5nLCB2Mjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMucG9zZXRfaGlzdG9yeS51bnNoaWZ0KHRoaXMucG9zZXQoKS5hZGRfZ3JlYXRlcl90aGFuKHYxLCB2MikpXG4gICAgICAgIHRoaXMuY29tcGFyaXNvbl9oaXN0b3J5LnVuc2hpZnQoW3YxLCB2Ml0pXG4gICAgICAgIHRoaXMuc3VnZ2VzdCgpXG4gICAgfVxuICAgIHN1Z2dlc3QoKTogdm9pZCB7XG4gICAgICAgIGNsZWFyX2Nob2ljZV9kaXYoKVxuICAgICAgICBsZXQgcGFpciA9IHRoaXMub2ZfaW50ZXJlc3QoKVxuICAgICAgICBpZiAocGFpclswXSAhPSBmYWxzZSkge1xuICAgICAgICAgICAgZHJhd19jaG9pY2UocGFpclsxXVswXSwgcGFpclsxXVsxXSlcbiAgICAgICAgICAgIGRyYXdfZXN0aW1hdGUodGhpcy5wb3NldCgpLmVzdGltYXRlX3F1ZXN0aW9uc19yZW1haW5pbmcodGhpcy5tYXhfaW50ZXJlc3QpKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHJhd19hc3NpZ25tZW50KHRoaXMucG9zZXQoKS5wcmludF92YWxpZCgpLnJldmVyc2UoKS5zbGljZSgwLCB0aGlzLm1heF9pbnRlcmVzdCkpXG4gICAgICAgICAgICBoaWRlX2VzdGltYXRlKClcbiAgICAgICAgfVxuICAgICAgICBkcmF3X2hpc3RvcnkodGhpcy5jb21wYXJpc29uX2hpc3RvcnkpXG4gICAgfVxuICAgIHVuZG8oKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnBvc2V0X2hpc3RvcnkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdGhpcy5wb3NldF9oaXN0b3J5LnNoaWZ0KClcbiAgICAgICAgICAgIHRoaXMuY29tcGFyaXNvbl9oaXN0b3J5LnNoaWZ0KClcbiAgICAgICAgICAgIGhpZGVfYXNzaWdubWVudCgpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdWdnZXN0KClcbiAgICB9XG4gICAgcmVtYWluaW5nKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLnBvc2V0KCkuZXN0aW1hdGVfcXVlc3Rpb25zX3JlbWFpbmluZyh0aGlzLm1heF9pbnRlcmVzdClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFyX2hpc3RvcnkoKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGlzdG9yeVwiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gXCJcIlxufVxuXG5mdW5jdGlvbiBkcmF3X2hpc3RvcnkoY29tcGFyaXNvbnM6IFtzdHJpbmcsIHN0cmluZ11bXSkge1xuICAgIGNsZWFyX2hpc3RvcnkoKVxuXG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGlzdG9yeVwiKVxuICAgIGlmIChjb21wYXJpc29ucy5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgbGV0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBsZXQgdW5kb0J1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIilcbiAgICAgICAgdW5kb0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZXYgPT4ge1xuICAgICAgICAgICAgVkcudW5kbygpXG4gICAgICAgIH0pXG4gICAgICAgIHVuZG9CdXR0b24uaW5uZXJUZXh0ID0gXCJVbmRvIExhc3RcIlxuICAgICAgICBsYWJlbC5hcHBlbmRDaGlsZCh1bmRvQnV0dG9uKVxuICAgICAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKFwidGhyZWUtd2lkZVwiKVxuICAgICAgICBkaXYhLmFwcGVuZENoaWxkKGxhYmVsKVxuICAgICAgICBjb21wYXJpc29ucy5mb3JFYWNoKGMgPT4ge1xuICAgICAgICAgICAgbGV0IGNwMSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgICAgIGxldCBjcDIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgICAgICBsZXQgY3AzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuXG4gICAgICAgICAgICBjcDEuaW5uZXJUZXh0ID0gY1swXVxuICAgICAgICAgICAgY3AyLnRleHRDb250ZW50ID0gXCI+XCJcbiAgICAgICAgICAgIGNwMy5pbm5lclRleHQgPSBjWzFdXG5cbiAgICAgICAgICAgIGRpdiEuYXBwZW5kQ2hpbGQoY3AxKVxuICAgICAgICAgICAgZGl2IS5hcHBlbmRDaGlsZChjcDIpXG4gICAgICAgICAgICBkaXYhLmFwcGVuZENoaWxkKGNwMylcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFyX2Nob2ljZV9kaXYoKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29tcGFyaXNvbnNcIilcbiAgICBkaXYhLmlubmVySFRNTCA9IFwiXCJcbn1cblxuXG5mdW5jdGlvbiBoaWRlX2VzdGltYXRlKCkge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVzdGltYXRlXCIpXG4gICAgZGl2IS5jbGFzc0xpc3QuYWRkKFwiaW52aXNpYmxlXCIpXG4gICAgZGl2IS5pbm5lckhUTUwgPSBcIlwiXG59XG5cbmZ1bmN0aW9uIGRyYXdfZXN0aW1hdGUoZXN0aW1hdGU6IG51bWJlcikge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVzdGltYXRlXCIpXG4gICAgZGl2IS5jbGFzc0xpc3QucmVtb3ZlKFwiaW52aXNpYmxlXCIpXG4gICAgbGV0IGVzdGltYXRlX3RleHQgPSBlc3RpbWF0ZS50b1N0cmluZygpXG4gICAgaWYgKGVzdGltYXRlIDwgMTApIHtcbiAgICAgICAgZXN0aW1hdGVfdGV4dCA9IFwiVW5kZXIgMTBcIlxuICAgIH1cbiAgICBkaXYhLmlubmVySFRNTCA9IGBFc3RpbWF0ZWQgcXVlc3Rpb25zIHJlbWFpbmluZzogJHtlc3RpbWF0ZV90ZXh0fWBcbn1cblxuXG5cbmZ1bmN0aW9uIGhpZGVfYXNzaWdubWVudCgpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhc3NpZ25tZW50XCIpXG4gICAgZGl2IS5jbGFzc0xpc3QuYWRkKFwiaW52aXNpYmxlXCIpXG4gICAgZGl2IS5pbm5lckhUTUwgPSBcIlwiXG59XG5cbmZ1bmN0aW9uIGRyYXdfYXNzaWdubWVudCh2YWx1ZXM6IHN0cmluZ1tdKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXNzaWdubWVudFwiKVxuICAgIGRpdiEuY2xhc3NMaXN0LnJlbW92ZShcImludmlzaWJsZVwiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gYDxoMT5Zb3VyIHRvcCB2YWx1ZXMsIHJhbmtlZDwvaDE+YCArIHZhbHVlcy5tYXAodiA9PiBgPGRpdiBjbGFzcz0ndmFsdWVSZXBvcnQnPjxoMj4ke3Z9PC9oMj48cD4keyhEZWZpbml0aW9ucyBhcyBhbnkpW3ZdfTwvcD48L2Rpdj5gKS5qb2luKFwiXFxuXCIpXG59XG5cbmZ1bmN0aW9uIHJGcm9tPFQ+KHdlaWdodGVkOiBbVCwgbnVtYmVyXVtdKTogVCB7XG4gICAgbGV0IHRvdGFsID0gKHdlaWdodGVkLm1hcCh2ID0+IHZbMV0pKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKVxuICAgIGxldCByID0gTWF0aC5yYW5kb20oKSAqIHRvdGFsXG4gICAgd2hpbGUgKHIgPiAwKSB7XG4gICAgICAgIGxldCBwb3BwZWQgPSB3ZWlnaHRlZC5wb3AoKSBhcyBbVCwgbnVtYmVyXVxuICAgICAgICByIC09IHBvcHBlZFsxXVxuICAgICAgICBpZiAociA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwb3BwZWRbMF1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTaG91bGQgbmV2ZXIgcmVhY2ggaGVyZVxuICAgIHRocm93IG5ldyBFcnJvcihcIldlaWdodGVkIGxpc3Qgd2FzIGVtcHR5XCIpXG59XG5cbmZ1bmN0aW9uIGRyYXdfY2hvaWNlKHYxOiBzdHJpbmcsIHYyOiBzdHJpbmcpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb21wYXJpc29uc1wiKVxuICAgIGZ1bmN0aW9uIGJ1dHRvbih2OiBzdHJpbmcsIHc6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgbGV0IGIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpXG4gICAgICAgIGIuaW5uZXJUZXh0ID0gdlxuICAgICAgICBiLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBldiA9PiB7XG4gICAgICAgICAgICBWRy5jaG9vc2UodiwgdylcbiAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuIGJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtaW5pX2xhYmVsKHY6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgbGV0IGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgIGQuaW5uZXJUZXh0ID0gKERlZmluaXRpb25zIGFzIGFueSlbdl1cbiAgICAgICAgZC5jbGFzc0xpc3QuYWRkKFwiZGVmaW5pdGlvblwiKVxuICAgICAgICByZXR1cm4gZFxuICAgIH1cbiAgICBsZXQgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaDFcIilcbiAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKFwiaGVhZGVyXCIpXG4gICAgbGFiZWwuY2xhc3NMaXN0LmFkZChcInR3by13aWRlXCIpXG4gICAgbGFiZWwuaW5uZXJIVE1MID0gXCJXaGljaCBpcyBtb3JlIGltcG9ydGFudD9cIlxuICAgIGNsZWFyX2Nob2ljZV9kaXYoKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQobGFiZWwpXG4gICAgZGl2IS5hcHBlbmRDaGlsZChidXR0b24odjEsIHYyKSlcbiAgICBkaXYhLmFwcGVuZENoaWxkKGJ1dHRvbih2MiwgdjEpKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQobWluaV9sYWJlbCh2MSkpXG4gICAgZGl2IS5hcHBlbmRDaGlsZChtaW5pX2xhYmVsKHYyKSlcbn1cblxubGV0IFZHOiBWYWx1ZXNHYW1lXG5mdW5jdGlvbiBzdGFydCgpIHtcbiAgICBsZXQgbWF4X2FuZF9jYXRlZ29yaWVzID0gcmVhZF9HRVQoKVxuICAgIGxldCBjYXRlZ29yaWVzID0gbWF4X2FuZF9jYXRlZ29yaWVzWzFdXG4gICAgbGV0IG1heF90b19kZXRlcm1pbmUgPSBtYXhfYW5kX2NhdGVnb3JpZXNbMF1cbiAgICBWRyA9IG5ldyBWYWx1ZXNHYW1lKG1heF90b19kZXRlcm1pbmUsIGNhdGVnb3JpZXMpXG4gICAgVkcuc3VnZ2VzdCgpXG59XG5cbmxldCByZWFkX0dFVCA9IGZ1bmN0aW9uICgpOiBbbnVtYmVyLCBDYXRlZ29yaWVzW11dIHtcbiAgICBsZXQgYnJlYWtfYXRfcXVlc3Rpb25fbWFyayA9IHdpbmRvdy5sb2NhdGlvbi50b1N0cmluZygpLnNwbGl0KC9cXD8vKVxuICAgIGxldCBhbGxfY2F0ZWdvcmllcyA9IE9iamVjdC5rZXlzKENhdGVnb3JpZXMpLmZpbHRlcihrID0+IE51bWJlci5pc05hTigraykpIGFzIENhdGVnb3JpZXNbXTtcbiAgICBpZiAoYnJlYWtfYXRfcXVlc3Rpb25fbWFyay5sZW5ndGggPT0gMSkge1xuICAgICAgICByZXR1cm4gWzUsIGFsbF9jYXRlZ29yaWVzXVxuICAgIH1cbiAgICBsZXQgaW5zdHJ1Y3Rpb25zID0gYnJlYWtfYXRfcXVlc3Rpb25fbWFya1sxXVxuICAgIGxldCBtYXhfdG9fZmluZCA9IDVcbiAgICBsZXQgY2F0ZWdvcmllc190b19pbmNsdWRlID0gYWxsX2NhdGVnb3JpZXNcbiAgICBpbnN0cnVjdGlvbnMuc3BsaXQoXCImXCIpLm1hcChzID0+IHtcbiAgICAgICAgbGV0IHBhcnRzID0gcy5zcGxpdChcIj1cIilcbiAgICAgICAgaWYgKHBhcnRzWzBdID09IFwiaW5jbHVkZVwiKSB7XG4gICAgICAgICAgICBjYXRlZ29yaWVzX3RvX2luY2x1ZGUgPSBbXVxuICAgICAgICAgICAgbGV0IGNhdHMgPSBwYXJ0c1sxXS5zcGxpdChcIixcIilcbiAgICAgICAgICAgIGNhdHMuZm9yRWFjaChyZXF1ZXN0ZWRfY2F0ID0+IHtcbiAgICAgICAgICAgICAgICBhbGxfY2F0ZWdvcmllcy5mb3JFYWNoKHJlYWxfY2F0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWxfY2F0ID09IHJlcXVlc3RlZF9jYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXNfdG9faW5jbHVkZS5wdXNoKHJlYWxfY2F0KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcnRzWzBdID09IFwibWF4XCIpIHtcbiAgICAgICAgICAgIG1heF90b19maW5kID0gcGFyc2VJbnQocGFydHNbMV0pXG4gICAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBbbWF4X3RvX2ZpbmQsIGNhdGVnb3JpZXNfdG9faW5jbHVkZV1cbn0iXX0=