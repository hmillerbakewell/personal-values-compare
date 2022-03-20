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
    print_valid() {
        return print_assignation(assign_ordering(this));
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
let Definitions = {
    "Adventure": "Finding new excitements",
    "Appearance": "Beauty, presence, and fashion",
    "Challenge": "Pushing yourself, regardless of the goal",
    "Community": "Being part of a large group",
    "Curiosity": "Encountering new ideas",
    "Dancing": "Alone or with others",
    "Emotional Independence": "Your mood is not reliant on the actions of others",
    "Exercise": "Things you do to keep fit",
    "Faith": "Connection to something beyond humanity",
    "Friendship": "Deep relationships within a small group",
    "Games": "Boardgames, cards, computer games, etc.",
    "Learning": "Amassing knowledge and skills",
    "Love": "Finding people to share your heart with",
    "Peace": "Quiet surroundings or internal peace",
    "Performing Arts": "Music, theatre, etc.",
    "Physical Independence": "Living without routine assistance",
    "Quiet Hobbies": "Occupied moments of calm",
    "Religion": "The routine, structure, and community, as opposed to Faith",
    "Reputation": "The things strangers might know you for",
    "Responsibility": "Being trusted by others",
    "Stability": "Confidence that next week will be like this week",
    "Sport": "Watching or taking part in",
    "Treats": "Indulging yourself",
    "Visual Arts and Crafts": "Creating or admiring",
    "Work": "Fulfilling employment",
};
let Values = [];
for (let key in Definitions) {
    Values.push(key);
}
class ValuesGame {
    constructor(max_interest) {
        this.max_interest = max_interest;
        this.poset_history = [];
        this.comparison_history = [];
        this.poset_history.push(new ComparisonPoset(Values));
    }
    poset() {
        // Top one is always most recent
        return this.poset_history[0];
    }
    of_interest() {
        let rating_info = this.poset().ratings(this.max_interest);
        let valid_competition = rating_info.filter(ri => ri.unknown_comparisons.length > 0);
        if (valid_competition.length == 0) {
            return [false, []];
        }
        let first_choice = rFrom(valid_competition.map(v => [v, 1 / (1 + v.rating)]));
        let second_choice = rFrom(first_choice.unknown_comparisons.map(v => [v, 1 / (1 + this.poset()._max_rating(v))]));
        return [true, [first_choice.value, second_choice]];
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
        }
        else {
            draw_assignment(this.poset().print_valid().reverse().slice(0, this.max_interest));
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
    let label = document.createElement("div");
    label.classList.add("header");
    label.classList.add("two-wide");
    label.innerHTML = "Which is more important to you?";
    clear_choice_div();
    div.appendChild(label);
    div.appendChild(button(v1, v2));
    div.appendChild(button(v2, v1));
    div.appendChild(mini_label(v1));
    div.appendChild(mini_label(v2));
}
let VG = new ValuesGame(5);
function start() {
    VG.suggest();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQU0sZUFBZTtJQUVqQixZQUFxQixXQUFxQixFQUFFLFlBQXFDLElBQUksR0FBRyxFQUFFO1FBQXJFLGdCQUFXLEdBQVgsV0FBVyxDQUFVO1FBRDFDLGNBQVMsR0FBNEIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUUxQyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ2xFLENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxDQUFDLENBQUE7U0FDTDtJQUNMLENBQUM7SUFDRCxVQUFVLENBQUMsRUFBVSxFQUFFLEVBQVU7UUFDN0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFlLENBQUE7SUFDbkUsQ0FBQztJQUNELFNBQVMsQ0FBQyxFQUFVO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUNELFNBQVMsQ0FB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b25Qb3NldCB7XG4gICAgb3JkZXJpbmdzOiBNYXA8c3RyaW5nLCBDb21wYXJpc29uPiA9IG5ldyBNYXAoKVxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGh1bWFuVmFsdWVzOiBzdHJpbmdbXSwgb3JkZXJpbmdzOiBNYXA8c3RyaW5nLCBDb21wYXJpc29uPiA9IG5ldyBNYXAoKSkge1xuICAgICAgICB0aGlzLm9yZGVyaW5ncyA9IGNvcHlfbWFwKG9yZGVyaW5ncylcbiAgICAgICAgaWYgKFsuLi5vcmRlcmluZ3MudmFsdWVzKCldLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmh1bWFuVmFsdWVzLm1hcCh2MSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5odW1hblZhbHVlcy5tYXAodjIgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9yZGVyaW5ncy5zZXQoY29tYmluZV92YWx1ZXModjEsIHYyKSwgQ29tcGFyaXNvbi5Vbmtub3duKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuICAgIGNvbXBhcmlzb24odjE6IHN0cmluZywgdjI6IHN0cmluZyk6IENvbXBhcmlzb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5vcmRlcmluZ3MuZ2V0KGNvbWJpbmVfdmFsdWVzKHYxLCB2MikpIGFzIENvbXBhcmlzb25cbiAgICB9XG4gICAgYWxsX2Fib3ZlKHYxOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2MiA9PiB0aGlzLmNvbXBhcmlzb24odjIsIHYxKSA9PSBDb21wYXJpc29uLkdyZWF0ZXJUaGFuKVxuICAgIH1cbiAgICBhbGxfYmVsb3codjE6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYyID0+IHRoaXMuY29tcGFyaXNvbih2MSwgdjIpID09IENvbXBhcmlzb24uR3JlYXRlclRoYW4pXG4gICAgfVxuICAgIGFkZF9ncmVhdGVyX3RoYW4oaGlnaGVyOiBzdHJpbmcsIGxvd2VyOiBzdHJpbmcpOiBDb21wYXJpc29uUG9zZXQge1xuICAgICAgICBsZXQgaGlnaGVyX2FuZF9hYm92ZSA9IFtoaWdoZXJdLmNvbmNhdCh0aGlzLmFsbF9hYm92ZShoaWdoZXIpKVxuICAgICAgICBsZXQgbG93ZXJfYW5kX2JlbG93ID0gW2xvd2VyXS5jb25jYXQodGhpcy5hbGxfYmVsb3cobG93ZXIpKVxuICAgICAgICBsZXQgbyA9IGNvcHlfbWFwKHRoaXMub3JkZXJpbmdzKVxuICAgICAgICBoaWdoZXJfYW5kX2Fib3ZlLm1hcCh2MSA9PiB7XG4gICAgICAgICAgICBsb3dlcl9hbmRfYmVsb3cubWFwKHYyID0+IHtcbiAgICAgICAgICAgICAgICBvLnNldChjb21iaW5lX3ZhbHVlcyh2MSwgdjIpLCBDb21wYXJpc29uLkdyZWF0ZXJUaGFuKVxuICAgICAgICAgICAgICAgIG8uc2V0KGNvbWJpbmVfdmFsdWVzKHYyLCB2MSksIENvbXBhcmlzb24uTGVzc1RoYW5PckVxdWFsKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gbmV3IENvbXBhcmlzb25Qb3NldCh0aGlzLmh1bWFuVmFsdWVzLCBvKVxuICAgIH1cbiAgICBwcmludF92YWxpZCgpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBwcmludF9hc3NpZ25hdGlvbihhc3NpZ25fb3JkZXJpbmcodGhpcykpXG4gICAgfVxuXG4gICAgX21heF9yYXRpbmcodmFsdWU6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIC8vIDAtaW5kZXhlZCwgMCBtZWFucyBkZWZpbml0ZWx5IGF0IHRoZSB0b3BcbiAgICAgICAgLy8gcmF0aW5nIG9mIG4gbWVhbnMgdGhlcmUgYXJlIG4gZGVmaW5pdGVseSBhYm92ZSB0aGlzXG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2MiA9PiB0aGlzLmNvbXBhcmlzb24odjIsIHZhbHVlKSA9PSBDb21wYXJpc29uLkdyZWF0ZXJUaGFuKS5sZW5ndGhcbiAgICB9XG5cbiAgICByYXRpbmdzKG1heDogbnVtYmVyKTogUmF0aW5nSW5mb3JtYXRpb25bXSB7XG5cbiAgICAgICAgbGV0IHF1YWxpZnlpbmcgPSB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2ID0+IHRoaXMuX21heF9yYXRpbmcodikgPCBtYXgpXG5cbiAgICAgICAgcmV0dXJuIHF1YWxpZnlpbmcubWFwKHYgPT4gbmV3IFJhdGluZ0luZm9ybWF0aW9uKFxuICAgICAgICAgICAgdixcbiAgICAgICAgICAgIHRoaXMuX21heF9yYXRpbmcodiksXG4gICAgICAgICAgICBxdWFsaWZ5aW5nLmZpbHRlcih3ID0+IHRoaXMuY29tcGFyaXNvbih2LCB3KSA9PSBDb21wYXJpc29uLlVua25vd24gJiYgKHYgIT0gdykpXG4gICAgICAgICkpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb3B5X21hcDxLLCBWPihvcmRlcmluZzogTWFwPEssIFY+KTogTWFwPEssIFY+IHtcbiAgICBsZXQgbzogTWFwPEssIFY+ID0gbmV3IE1hcCgpO1xuICAgIFsuLi5vcmRlcmluZy5rZXlzKCldLm1hcChrID0+IHtcbiAgICAgICAgby5zZXQoaywgb3JkZXJpbmcuZ2V0KGspIGFzIFYpXG4gICAgfSlcbiAgICByZXR1cm4gb1xufVxuXG5jbGFzcyBSYXRpbmdJbmZvcm1hdGlvbiB7XG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgdmFsdWU6IHN0cmluZywgcmVhZG9ubHkgcmF0aW5nOiBudW1iZXIsIHJlYWRvbmx5IHVua25vd25fY29tcGFyaXNvbnM6IHN0cmluZ1tdKSB7IH1cbn1cblxuZnVuY3Rpb24gYXNzaWduX29yZGVyaW5nKHBvc2V0OiBDb21wYXJpc29uUG9zZXQpOiBNYXA8c3RyaW5nLCBudW1iZXI+IHtcbiAgICBsZXQgYXNzaWduYXRpb24gPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpXG4gICAgcG9zZXQuaHVtYW5WYWx1ZXMubWFwKHZhbHVlID0+IGFzc2lnbmF0aW9uLnNldCh2YWx1ZSwgTWF0aC5yYW5kb20oKSkpXG4gICAgbGV0IG1pc3NtYXRjaCA9IGZ1bmN0aW9uICgpOiBCb29sZWFuIHtcbiAgICAgICAgLy8gTmVlZCB0byBjaGVjayB0aGF0IGlmIGEgPiBiIGluIHRoZSBwb3NldCB0aGVuIGEgPiBiIGluIHRoZSBhc3NpZ25hdGlvblxuICAgICAgICBmb3IgKGxldCB2YWx1ZSBvZiBwb3NldC5odW1hblZhbHVlcykge1xuICAgICAgICAgICAgbGV0IGJlbG93ID0gcG9zZXQuYWxsX2JlbG93KHZhbHVlKVxuICAgICAgICAgICAgbGV0IGJpZ2dlc3RfYmVsb3cgPSBNYXRoLm1heCguLi5iZWxvdy5tYXAodiA9PiBhc3NpZ25hdGlvbi5nZXQodikgYXMgQ29tcGFyaXNvbikpXG4gICAgICAgICAgICBpZiAoYXNzaWduYXRpb24uZ2V0KHZhbHVlKSBhcyBDb21wYXJpc29uIDw9IGJpZ2dlc3RfYmVsb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICBsZXQgY291bnRlciA9IDBcbiAgICBsZXQgbWF4ID0gMTAwXG4gICAgd2hpbGUgKG1pc3NtYXRjaCgpICYmIGNvdW50ZXIgPCBtYXgpIHtcbiAgICAgICAgZm9yIChsZXQgdmFsdWUgb2YgcG9zZXQuaHVtYW5WYWx1ZXMpIHtcbiAgICAgICAgICAgIGxldCBiZWxvdyA9IHBvc2V0LmFsbF9iZWxvdyh2YWx1ZSlcbiAgICAgICAgICAgIGxldCBiaWdnZXN0X2JlbG93ID0gTWF0aC5tYXgoLi4uYmVsb3cubWFwKHYgPT4gYXNzaWduYXRpb24uZ2V0KHYpIGFzIG51bWJlcikpXG4gICAgICAgICAgICBpZiAoYXNzaWduYXRpb24uZ2V0KHZhbHVlKSBhcyBudW1iZXIgPD0gYmlnZ2VzdF9iZWxvdykge1xuICAgICAgICAgICAgICAgIGFzc2lnbmF0aW9uLnNldCh2YWx1ZSwgYmlnZ2VzdF9iZWxvdyArICgxIC0gYmlnZ2VzdF9iZWxvdykgKiBNYXRoLnJhbmRvbSgpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvdW50ZXIrK1xuICAgIH1cbiAgICBpZiAoY291bnRlciA9PSBtYXgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGltZW91dFwiKVxuICAgIH1cbiAgICByZXR1cm4gYXNzaWduYXRpb25cbn1cblxuZnVuY3Rpb24gcHJpbnRfYXNzaWduYXRpb24oYXNzaWduYXRpb246IE1hcDxzdHJpbmcsIG51bWJlcj4pOiBzdHJpbmdbXSB7XG4gICAgbGV0IHZhbHVlcyA9IFsuLi5hc3NpZ25hdGlvbi5rZXlzKCldLnNvcnQoKGEsIGIpID0+IChhc3NpZ25hdGlvbi5nZXQoYSkgYXMgbnVtYmVyKSAtIChhc3NpZ25hdGlvbi5nZXQoYikgYXMgbnVtYmVyKSlcbiAgICByZXR1cm4gdmFsdWVzXG59XG5cbmZ1bmN0aW9uIGNvbWJpbmVfdmFsdWVzKHYxOiBzdHJpbmcsIHYyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB2MSArIFwiOjpcIiArIHYyXG59XG5cbmVudW0gQ29tcGFyaXNvbiB7XG4gICAgR3JlYXRlclRoYW4gPSAxLCBMZXNzVGhhbk9yRXF1YWwgPSAtMSwgVW5rbm93biA9IDBcbn1cblxuZnVuY3Rpb24gZmxpcF9jb21wYXJpc29uKGNvbXBhcmlzb246IENvbXBhcmlzb24pOiBDb21wYXJpc29uIHtcbiAgICBzd2l0Y2ggKGNvbXBhcmlzb24pIHtcbiAgICAgICAgY2FzZSBDb21wYXJpc29uLkdyZWF0ZXJUaGFuOlxuICAgICAgICAgICAgcmV0dXJuIENvbXBhcmlzb24uTGVzc1RoYW5PckVxdWFsXG4gICAgICAgIGNhc2UgQ29tcGFyaXNvbi5MZXNzVGhhbk9yRXF1YWw6XG4gICAgICAgICAgICByZXR1cm4gQ29tcGFyaXNvbi5HcmVhdGVyVGhhblxuICAgICAgICBjYXNlIENvbXBhcmlzb24uVW5rbm93bjpcbiAgICAgICAgICAgIHJldHVybiBDb21wYXJpc29uLlVua25vd25cbiAgICB9XG59XG5cblxubGV0IERlZmluaXRpb25zID0ge1xuICAgIFwiQWR2ZW50dXJlXCI6IFwiRmluZGluZyBuZXcgZXhjaXRlbWVudHNcIixcbiAgICBcIkFwcGVhcmFuY2VcIjogXCJCZWF1dHksIHByZXNlbmNlLCBhbmQgZmFzaGlvblwiLFxuICAgIFwiQ2hhbGxlbmdlXCI6IFwiUHVzaGluZyB5b3Vyc2VsZiwgcmVnYXJkbGVzcyBvZiB0aGUgZ29hbFwiLFxuICAgIFwiQ29tbXVuaXR5XCI6IFwiQmVpbmcgcGFydCBvZiBhIGxhcmdlIGdyb3VwXCIsXG4gICAgXCJDdXJpb3NpdHlcIjogXCJFbmNvdW50ZXJpbmcgbmV3IGlkZWFzXCIsXG4gICAgXCJEYW5jaW5nXCI6IFwiQWxvbmUgb3Igd2l0aCBvdGhlcnNcIixcbiAgICBcIkVtb3Rpb25hbCBJbmRlcGVuZGVuY2VcIjogXCJZb3VyIG1vb2QgaXMgbm90IHJlbGlhbnQgb24gdGhlIGFjdGlvbnMgb2Ygb3RoZXJzXCIsXG4gICAgXCJFeGVyY2lzZVwiOiBcIlRoaW5ncyB5b3UgZG8gdG8ga2VlcCBmaXRcIixcbiAgICBcIkZhaXRoXCI6IFwiQ29ubmVjdGlvbiB0byBzb21ldGhpbmcgYmV5b25kIGh1bWFuaXR5XCIsXG4gICAgXCJGcmllbmRzaGlwXCI6IFwiRGVlcCByZWxhdGlvbnNoaXBzIHdpdGhpbiBhIHNtYWxsIGdyb3VwXCIsXG4gICAgXCJHYW1lc1wiOiBcIkJvYXJkZ2FtZXMsIGNhcmRzLCBjb21wdXRlciBnYW1lcywgZXRjLlwiLFxuICAgIFwiTGVhcm5pbmdcIjogXCJBbWFzc2luZyBrbm93bGVkZ2UgYW5kIHNraWxsc1wiLFxuICAgIFwiTG92ZVwiOiBcIkZpbmRpbmcgcGVvcGxlIHRvIHNoYXJlIHlvdXIgaGVhcnQgd2l0aFwiLFxuICAgIFwiUGVhY2VcIjogXCJRdWlldCBzdXJyb3VuZGluZ3Mgb3IgaW50ZXJuYWwgcGVhY2VcIixcbiAgICBcIlBlcmZvcm1pbmcgQXJ0c1wiOiBcIk11c2ljLCB0aGVhdHJlLCBldGMuXCIsXG4gICAgXCJQaHlzaWNhbCBJbmRlcGVuZGVuY2VcIjogXCJMaXZpbmcgd2l0aG91dCByb3V0aW5lIGFzc2lzdGFuY2VcIixcbiAgICBcIlF1aWV0IEhvYmJpZXNcIjogXCJPY2N1cGllZCBtb21lbnRzIG9mIGNhbG1cIixcbiAgICBcIlJlbGlnaW9uXCI6IFwiVGhlIHJvdXRpbmUsIHN0cnVjdHVyZSwgYW5kIGNvbW11bml0eSwgYXMgb3Bwb3NlZCB0byBGYWl0aFwiLFxuICAgIFwiUmVwdXRhdGlvblwiOiBcIlRoZSB0aGluZ3Mgc3RyYW5nZXJzIG1pZ2h0IGtub3cgeW91IGZvclwiLFxuICAgIFwiUmVzcG9uc2liaWxpdHlcIjogXCJCZWluZyB0cnVzdGVkIGJ5IG90aGVyc1wiLFxuICAgIFwiU3RhYmlsaXR5XCI6IFwiQ29uZmlkZW5jZSB0aGF0IG5leHQgd2VlayB3aWxsIGJlIGxpa2UgdGhpcyB3ZWVrXCIsXG4gICAgXCJTcG9ydFwiOiBcIldhdGNoaW5nIG9yIHRha2luZyBwYXJ0IGluXCIsXG4gICAgXCJUcmVhdHNcIjogXCJJbmR1bGdpbmcgeW91cnNlbGZcIixcbiAgICBcIlZpc3VhbCBBcnRzIGFuZCBDcmFmdHNcIjogXCJDcmVhdGluZyBvciBhZG1pcmluZ1wiLFxuICAgIFwiV29ya1wiOiBcIkZ1bGZpbGxpbmcgZW1wbG95bWVudFwiLFxufVxuXG5sZXQgVmFsdWVzOiBzdHJpbmdbXSA9IFtdXG5mb3IgKGxldCBrZXkgaW4gRGVmaW5pdGlvbnMpIHtcbiAgICBWYWx1ZXMucHVzaChrZXkpXG59XG5cbmNsYXNzIFZhbHVlc0dhbWUge1xuICAgIHBvc2V0X2hpc3Rvcnk6IENvbXBhcmlzb25Qb3NldFtdID0gW11cbiAgICBjb21wYXJpc29uX2hpc3Rvcnk6IFtzdHJpbmcsIHN0cmluZ11bXSA9IFtdXG4gICAgcG9zZXQoKSB7XG4gICAgICAgIC8vIFRvcCBvbmUgaXMgYWx3YXlzIG1vc3QgcmVjZW50XG4gICAgICAgIHJldHVybiB0aGlzLnBvc2V0X2hpc3RvcnlbMF1cbiAgICB9XG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgbWF4X2ludGVyZXN0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5wb3NldF9oaXN0b3J5LnB1c2gobmV3IENvbXBhcmlzb25Qb3NldChWYWx1ZXMpKVxuICAgIH1cbiAgICBvZl9pbnRlcmVzdCgpOiBbYm9vbGVhbiwgc3RyaW5nW11dIHtcbiAgICAgICAgbGV0IHJhdGluZ19pbmZvID0gdGhpcy5wb3NldCgpLnJhdGluZ3ModGhpcy5tYXhfaW50ZXJlc3QpXG4gICAgICAgIGxldCB2YWxpZF9jb21wZXRpdGlvbiA9IHJhdGluZ19pbmZvLmZpbHRlcihyaSA9PiByaS51bmtub3duX2NvbXBhcmlzb25zLmxlbmd0aCA+IDApXG4gICAgICAgIGlmICh2YWxpZF9jb21wZXRpdGlvbi5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtmYWxzZSwgW11dXG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZmlyc3RfY2hvaWNlID0gckZyb20odmFsaWRfY29tcGV0aXRpb24ubWFwKHYgPT4gW3YsIDEgLyAoMSArIHYucmF0aW5nKV0pKVxuICAgICAgICBsZXQgc2Vjb25kX2Nob2ljZSA9IHJGcm9tKGZpcnN0X2Nob2ljZS51bmtub3duX2NvbXBhcmlzb25zLm1hcCh2ID0+IFt2LCAxIC8gKDEgKyB0aGlzLnBvc2V0KCkuX21heF9yYXRpbmcodikpXSkpXG4gICAgICAgIHJldHVybiBbdHJ1ZSwgW2ZpcnN0X2Nob2ljZS52YWx1ZSwgc2Vjb25kX2Nob2ljZV1dXG4gICAgfVxuICAgIGNob29zZSh2MTogc3RyaW5nLCB2Mjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHRoaXMucG9zZXRfaGlzdG9yeS51bnNoaWZ0KHRoaXMucG9zZXQoKS5hZGRfZ3JlYXRlcl90aGFuKHYxLCB2MikpXG4gICAgICAgIHRoaXMuY29tcGFyaXNvbl9oaXN0b3J5LnVuc2hpZnQoW3YxLCB2Ml0pXG4gICAgICAgIHRoaXMuc3VnZ2VzdCgpXG4gICAgfVxuICAgIHN1Z2dlc3QoKTogdm9pZCB7XG4gICAgICAgIGNsZWFyX2Nob2ljZV9kaXYoKVxuICAgICAgICBsZXQgcGFpciA9IHRoaXMub2ZfaW50ZXJlc3QoKVxuICAgICAgICBpZiAocGFpclswXSAhPSBmYWxzZSkge1xuICAgICAgICAgICAgZHJhd19jaG9pY2UocGFpclsxXVswXSwgcGFpclsxXVsxXSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyYXdfYXNzaWdubWVudCh0aGlzLnBvc2V0KCkucHJpbnRfdmFsaWQoKS5yZXZlcnNlKCkuc2xpY2UoMCwgdGhpcy5tYXhfaW50ZXJlc3QpKVxuICAgICAgICB9XG4gICAgICAgIGRyYXdfaGlzdG9yeSh0aGlzLmNvbXBhcmlzb25faGlzdG9yeSlcbiAgICB9XG4gICAgdW5kbygpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMucG9zZXRfaGlzdG9yeS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aGlzLnBvc2V0X2hpc3Rvcnkuc2hpZnQoKVxuICAgICAgICAgICAgdGhpcy5jb21wYXJpc29uX2hpc3Rvcnkuc2hpZnQoKVxuICAgICAgICAgICAgaGlkZV9hc3NpZ25tZW50KClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN1Z2dlc3QoKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY2xlYXJfaGlzdG9yeSgpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoaXN0b3J5XCIpXG4gICAgZGl2IS5pbm5lckhUTUwgPSBcIlwiXG59XG5cbmZ1bmN0aW9uIGRyYXdfaGlzdG9yeShjb21wYXJpc29uczogW3N0cmluZywgc3RyaW5nXVtdKSB7XG4gICAgY2xlYXJfaGlzdG9yeSgpXG5cbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoaXN0b3J5XCIpXG4gICAgaWYgKGNvbXBhcmlzb25zLmxlbmd0aCA+IDApIHtcblxuICAgICAgICBsZXQgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgIGxldCB1bmRvQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxuICAgICAgICB1bmRvQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBldiA9PiB7XG4gICAgICAgICAgICBWRy51bmRvKClcbiAgICAgICAgfSlcbiAgICAgICAgdW5kb0J1dHRvbi5pbm5lclRleHQgPSBcIlVuZG8gTGFzdFwiXG4gICAgICAgIGxhYmVsLmFwcGVuZENoaWxkKHVuZG9CdXR0b24pXG4gICAgICAgIGxhYmVsLmNsYXNzTGlzdC5hZGQoXCJ0aHJlZS13aWRlXCIpXG4gICAgICAgIGRpdiEuYXBwZW5kQ2hpbGQobGFiZWwpXG4gICAgICAgIGNvbXBhcmlzb25zLmZvckVhY2goYyA9PiB7XG4gICAgICAgICAgICBsZXQgY3AxID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICAgICAgbGV0IGNwMiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgICAgIGxldCBjcDMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG5cbiAgICAgICAgICAgIGNwMS5pbm5lclRleHQgPSBjWzBdXG4gICAgICAgICAgICBjcDIudGV4dENvbnRlbnQgPSBcIj5cIlxuICAgICAgICAgICAgY3AzLmlubmVyVGV4dCA9IGNbMV1cblxuICAgICAgICAgICAgZGl2IS5hcHBlbmRDaGlsZChjcDEpXG4gICAgICAgICAgICBkaXYhLmFwcGVuZENoaWxkKGNwMilcbiAgICAgICAgICAgIGRpdiEuYXBwZW5kQ2hpbGQoY3AzKVxuICAgICAgICB9KVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY2xlYXJfY2hvaWNlX2RpdigpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb21wYXJpc29uc1wiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gXCJcIlxufVxuXG5mdW5jdGlvbiBoaWRlX2Fzc2lnbm1lbnQoKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXNzaWdubWVudFwiKVxuICAgIGRpdiEuY2xhc3NMaXN0LmFkZChcImludmlzaWJsZVwiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gXCJcIlxufVxuXG5mdW5jdGlvbiBkcmF3X2Fzc2lnbm1lbnQodmFsdWVzOiBzdHJpbmdbXSkge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFzc2lnbm1lbnRcIilcbiAgICBkaXYhLmNsYXNzTGlzdC5yZW1vdmUoXCJpbnZpc2libGVcIilcbiAgICBkaXYhLmlubmVySFRNTCA9IGA8aDE+WW91ciB0b3AgdmFsdWVzLCByYW5rZWQ8L2gxPmAgKyB2YWx1ZXMubWFwKHYgPT4gYDxkaXYgY2xhc3M9J3ZhbHVlUmVwb3J0Jz48aDI+JHt2fTwvaDI+PHA+JHsoRGVmaW5pdGlvbnMgYXMgYW55KVt2XX08L3A+PC9kaXY+YCkuam9pbihcIlxcblwiKVxufVxuXG5mdW5jdGlvbiByRnJvbTxUPih3ZWlnaHRlZDogW1QsIG51bWJlcl1bXSk6IFQge1xuICAgIGxldCB0b3RhbCA9ICh3ZWlnaHRlZC5tYXAodiA9PiB2WzFdKSkucmVkdWNlKChhLCBiKSA9PiBhICsgYilcbiAgICBsZXQgciA9IE1hdGgucmFuZG9tKCkgKiB0b3RhbFxuICAgIHdoaWxlIChyID4gMCkge1xuICAgICAgICBsZXQgcG9wcGVkID0gd2VpZ2h0ZWQucG9wKCkgYXMgW1QsIG51bWJlcl1cbiAgICAgICAgciAtPSBwb3BwZWRbMV1cbiAgICAgICAgaWYgKHIgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9wcGVkWzBdXG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gU2hvdWxkIG5ldmVyIHJlYWNoIGhlcmVcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJXZWlnaHRlZCBsaXN0IHdhcyBlbXB0eVwiKVxufVxuXG5mdW5jdGlvbiBkcmF3X2Nob2ljZSh2MTogc3RyaW5nLCB2Mjogc3RyaW5nKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29tcGFyaXNvbnNcIilcbiAgICBmdW5jdGlvbiBidXR0b24odjogc3RyaW5nLCB3OiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIGxldCBiID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxuICAgICAgICBiLmlubmVyVGV4dCA9IHZcbiAgICAgICAgYi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZXYgPT4ge1xuICAgICAgICAgICAgVkcuY2hvb3NlKHYsIHcpXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiBiXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWluaV9sYWJlbCh2OiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIGxldCBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBkLmlubmVyVGV4dCA9IChEZWZpbml0aW9ucyBhcyBhbnkpW3ZdXG4gICAgICAgIGQuY2xhc3NMaXN0LmFkZChcImRlZmluaXRpb25cIilcbiAgICAgICAgcmV0dXJuIGRcbiAgICB9XG4gICAgbGV0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgIGxhYmVsLmNsYXNzTGlzdC5hZGQoXCJoZWFkZXJcIilcbiAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKFwidHdvLXdpZGVcIilcbiAgICBsYWJlbC5pbm5lckhUTUwgPSBcIldoaWNoIGlzIG1vcmUgaW1wb3J0YW50IHRvIHlvdT9cIlxuICAgIGNsZWFyX2Nob2ljZV9kaXYoKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQobGFiZWwpXG4gICAgZGl2IS5hcHBlbmRDaGlsZChidXR0b24odjEsIHYyKSlcbiAgICBkaXYhLmFwcGVuZENoaWxkKGJ1dHRvbih2MiwgdjEpKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQobWluaV9sYWJlbCh2MSkpXG4gICAgZGl2IS5hcHBlbmRDaGlsZChtaW5pX2xhYmVsKHYyKSlcbn1cblxubGV0IFZHID0gbmV3IFZhbHVlc0dhbWUoNSlcbmZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgIFZHLnN1Z2dlc3QoKVxufSJdfQ==