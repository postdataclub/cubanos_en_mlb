// TODO: termianr de refactorizar la partede la noticia
// TODO: limpar lo q no se utiliza despues de refactorizar

$.manager = {
    loaded: {},
    load: function (url, callback) {
        if (url in $.manager.loaded)
            return callback(Object.assign({}, $.manager.loaded[url]), false);
        let cache = false;
        /*if(url.search('file for cache')!==-1){
            cache=true;
        }*/
        $.ajax({
            url: url,
            dataType: 'json',
            cache: cache,
            success: function (data) {
                $.manager.loaded[url] = Object.assign({}, data);
                callback(data, true);
            }
          });
    },
    news: {
        url: 'past_news.json',
        keysmap: {},
        keys: null,
        loaded: false,
        _wrapper: function(callback){
            // wrap callback to precompute index of each key one time only
            let f = function(data, cached){
                let keys = Object.keys(data).reverse();
                $.manager.news.keys = keys;
                $.each(keys, (index,e)=> $.manager.news.keysmap[e]=index);
                $.manager.news.loaded = true;
                return callback(data);
            }
            return f;
        },
        load: function (callback) {
            $.manager.load($.manager.news.url, $.manager.news._wrapper(callback));
        },
        _get_new: function(key, with_paragraph = true, with_indexs = true){
            let news = $.manager.loaded[$.manager.news.url];
            let res = {
                date: key,
                title: news[key].title,
                author: news[key].author,
                abstract: news[key].summary,
            }
            if(with_paragraph===true){
                res['paragraphs'] = news[key].paragraphs;
            }
            if(with_indexs===true){
                let indexs = $.manager.news._get_prev_next(key);
                Object.assign(res, {index: indexs});
            }
            return res;
        },
        _get_prev_next: function(key){
            let next = null;
            let nindex = $.manager.news.keysmap[key];
            nindex -= 1;
            if(nindex>=0){
                next = $.manager.news.keys[nindex];
            }
            let prev = null
            let pindex = $.manager.news.keysmap[key];
            pindex += 1;
            if(pindex<$.manager.news.keys.length){
                prev = $.manager.news.keys[pindex];
            }
            let indexs = {
                prev: prev,
                next: next,
                current: key,
            }
            return indexs;
        },
        build_card: function(key){
            let data = $.manager.news._get_new(key, false, false);

            let grid = $("<div></div>");
            grid.attr('class', 'col mb-my');

            let card = $("<div></div>");
            card.attr('class', 'card h-100');

            let body = $("<div></div>");
            body.attr('class', 'card-body');

            let date = $("<p></p>").text(key);
            date.attr('class', 'text-muted text-sm-center');
            body.append(date)

            let head = $("<h4></h4>")
            head.attr('class','header-card')
            let heada = $("<a></a>").text(data.title);
            heada.attr('href','#'+data.date);
            head.append(heada);
            body.append(head);

            let abstract = $("<p></p>").text(data.abstract);
            abstract.attr('class','resume-card');
            body.append(abstract);

            card.append(body);

            let more = $("<a></a>").text("Leer más > ");
            more.attr('class', 'text-right');
            more.attr('style', 'white-space: pre;');
            more.attr("href", '#'+key);
            card.append(more);

            grid.append(card)
            return grid;
        },
    },
    router: {
        routes: {
            default: function(url){
                if(url in $.manager.news.keysmap){
                    return {
                        routeid: url,
                        controller: render_new,
                        el: $("#current-new"),
                    }
                }
                return null;
            },
            'home': {
                routeid: 'home',
                controller: render_home,
                el: $("#principal-page"),
            }
        },
        elements: [$("#current-new"),$("#principal-page")],
        current_route: 'home',
        router: function  () {
            if($.manager.news.loaded===false){
                $.manager.news.load( function(news){
                    $.manager.router.router();
                });
                return;
            }
            // Current route url (getting rid of '#' in hash as well):
            let url = location.hash.slice(1);
            if(url===''){
                location.hash='home';
                return;
            }
            // Get route by url:
            let route = null;
            if(url in $.manager.router.routes){
                route = $.manager.router.routes[url];
            }else{
                route = $.manager.router.routes.default(url);
            }
            // TODO: implement not found
            /* control of not found route 404
            if(route===null){
                //do somenthing
            }*/
            $.manager.router.current_route = url;
            let el = null;
            if (route.controller && route.el) {
                el = route.el;
                route.controller(el);
            }
            for(var i in $.manager.router.elements){
                $.manager.router.elements[i].hide();
            }
            el.show();
        },
    },
};

var one_time_rende_home = true;
var home_is_rendered = false;

function render_home(el){
    if(one_time_rende_home===true && home_is_rendered===true)return;
    let carddeck = $("<div></div>");
    carddeck.attr('class', 'row row-cols-1 row-cols-md-2 row-cols-lg-3');
    let keys = $.manager.news.keys;
    let c = null;
    let date = null;
    for (var d in keys){
        date = keys[d]
        c = $.manager.news.build_card(date);
        carddeck.append(c);
    }
    let nl = el.find("#news-list");
    nl.append(carddeck);
    if(home_is_rendered===false)home_is_rendered=true;
}

function render_new(el){

    let idd = $.manager.router.current_route;
    let data = $.manager.news._get_new(idd);
    el.find("p").remove(".paragraph-new");
    el.find("#nav-current").text("Resumen "+data.date);
    el.find("#title-new").text(data.title);
    el.find("#author-new").html('Por: <span class="author-name">'+data.author+'</span>');
    el.find("#date-new").text(data.date);

    let tn = el.find("#text-new");
    let paragraphs = data.paragraphs;
    let p = null;
    for (var i in paragraphs){
        p = $("<p></p>").text(paragraphs[i]).attr("class", "paragraph-new");
        tn.append(p);
    }

    let tm = el.find('#tomorrow-new');
    let ye = el.find("#yesterday-new");
    tm.hide();
    ye.hide();
    if(data.index.next!==null){
        tm.text('Resumen '+data.index.next);
        tm.attr('href', '#'+data.index.next);
        tm.show();
    }
    if(data.index.prev!==null){
        ye.text('Resumen '+data.index.prev);
        ye.attr('href', '#'+data.index.prev);
        ye.show();
    }
    window.scrollTo(0,0);

};

window.addEventListener('hashchange', $.manager.router.router);
// Listen on page load:
window.addEventListener('load', $.manager.router.router);
