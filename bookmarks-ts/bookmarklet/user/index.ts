import { component } from 'vuets'
import { defp, extractMsg, $escape, bit_clear_and_set, base64ToBytes, to_int32LE } from 'vueds/lib/util'
import { PojoState, HasState } from 'vueds/lib/types'
import { diffVmFieldTo } from 'vueds/lib/diff'
import { post } from 'vueds/lib/rpc/'
import { bindFocus, debounce, Keys } from 'vueds-ui/lib/dom_util'
import * as Vue from 'vue'
const nextTick = Vue.nextTick

interface Config {
    url: string
    title: string
    notes: string
}

namespace $ {
    /** optional: 1 */
    //export const key = "key"
    /** optional: 2 */
    //export const ts = "ts"
    /** required: 3 */
    export const url = "url"
    /** optional: 4 */
    //export const normalized = "normalized"
    /** optional: 5 */
    //export const identifier = "identifier"
    /** optional: 6 */
    export const title = "title"
    /** optional: 7 */
    export const notes = "notes"
    /** optional: 8 */
    export const serTags = "serTags"
    /** optional: 9 */
    //export const tagCount = "tagCount"
    /** optional: 10 */
    //export const www = "www"
    /** optional: 11 */
    //export const date = "date"
    /** optional: 12 */
    //export const rev = "rev"
    /** optional: 13 */
    //export const updateTs = "updateTs"
    /** optional: 14 */
    //export const active = "active"
}

const $descriptor = {
    //$kind: 11,
    //$rfbs: 4, $rfdf: ['3'],
    //$fdf: ['3','6','7','14'],
    //'1': {_: 1, t: 2, m: 1, a: 6, $: 'key', $n: 'Key'},
    //'2': {_: 2, t: 11, m: 1, a: 6, $: 'ts', $n: 'Ts', o: 4},
    //'3': {_: 3, t: 3, m: 2, a: 4, $: 'url', $n: 'Url', vfn: $validateUrl},
    //'4': {_: 4, t: 3, m: 1, a: 7, $: 'normalized', $n: 'Url'},
    //'5': {_: 5, t: 3, m: 1, a: 7, $: 'identifier', $n: 'Identifier'},
    '6': {_: 6, t: 3, m: 1, a: 0, $: 'title', $n: 'Title'/*, vfn: $validateTitle*/},
    '7': {_: 7, t: 3, m: 1, a: 0, $: 'notes', $n: 'Notes'/*, vfn: $validateNotes*/},
    //'8': {_: 8, t: 2, m: 1, a: 3, $: 'serTags', $n: 'Ser Tags'},
    //'9': {_: 9, t: 10, m: 1, a: 3, $: 'tagCount', $n: 'Tag Count'},
    //'10': {_: 10, t: 1, m: 1, a: 7, $: 'www', $n: 'Www'},
    //'11': {_: 11, t: 11, m: 1, a: 7, $: 'date', $n: 'Date', o: 2},
    //'12': {_: 12, t: 10, m: 1, a: 3, $: 'rev', $n: 'Rev'},
    //'13': {_: 13, t: 11, m: 1, a: 3, $: 'updateTs', $n: 'Update Ts', o: 4},
    //'14': {_: 14, t: 1, m: 1, a: 2, $: 'active', $n: 'Active'},
    $: {
        //key: '1',
        //ts: '2',
        url: '3',
        //normalized: '4',
        //identifier: '5',
        title: '6',
        notes: '7',
        serTags: '8',
        //tagCount: '9',
        //www: '10',
        //date: '11',
        //rev: '12',
        //updateTs: '13',
        //active: '14'
        tags: '33'
    }//, $new: $createObservable, $change
}
const $0 = $descriptor.$

/*function $validateUrl() {}
function $validateTitle() {}
function $validateNotes() {}*/

const MAX_TAGS = 4,
    SUGGEST_TAGS_LIMIT = 12

interface Tag {
    id: number
    name : string
    state: number
}

const enum TagState {
    CURRENT = 32
}

export function toTagArray(serTags: string, names: string[]): Tag[] {
    let list: Tag[] = [],
        bytes = base64ToBytes(serTags)
    
    for (let i = 0, j = 0, len = bytes.length; i < len; i += 4) {
        let id = to_int32LE(bytes, i),
            name = names[j++]/*,
            color = tag && tag[Tag0.color] ? ('#' + tag[Tag0.color]) : DEFAULT_TAG_COLOR*/
        
        list.push({ id, name, state: 0 })
    }

    return list
}

interface Entry extends HasState {
    title: string
    notes: string
    tags: Tag[]
    // suggest fields
    suggest_tags: Tag[]
    tag_idx: number
    tag_name: string
}

interface M {
    original: Entry
}

function mapTag(item): Tag {
    return {
        id: item['3'],
        name: item['1'],
        state: 0
    }
}

function mapId(item: Tag): number {
    return item.id
}

function handleKeyEvent(e: KeyboardEvent, pojo: Entry, self: Home, fn_name: string): boolean {
    let suggest_tags: Tag[],
        tag: Tag,
        idx: number
    switch (e.which) {
        case Keys.ESCAPE:
            pojo.suggest_tags = []
            break
        case Keys.DOWN:
            idx = pojo.tag_idx
            suggest_tags = pojo.suggest_tags
            if (++idx === suggest_tags.length)
                break
            
            if (idx !== 0) {
                tag = suggest_tags[idx - 1]
                tag.state ^= TagState.CURRENT
            }
            
            tag = suggest_tags[idx]
            tag.state |= TagState.CURRENT

            pojo.tag_idx = idx
            break
        case Keys.UP:
            idx = pojo.tag_idx
            if (idx === 0)
                break
            
            suggest_tags = pojo.suggest_tags
            if (idx === -1) {
                // select last
                idx = suggest_tags.length - 1
                tag = suggest_tags[idx]
                tag.state |= TagState.CURRENT
                pojo.tag_idx = idx
                break
            }

            tag = suggest_tags[idx--]
            tag.state ^= TagState.CURRENT

            tag = suggest_tags[idx]
            tag.state |= TagState.CURRENT

            pojo.tag_idx = idx
            break
        case Keys.ENTER:
            idx = pojo.tag_idx
            if (idx !== -1)
                self[fn_name](pojo.suggest_tags[idx])
            
            break
        default:
            return true
    }
    e.preventDefault()
    e.stopPropagation()
    return false
}

export class Home {
    config: Config
    initialized = false
    unique = false
    url = ''
    pnew = {
        title: '',
        notes: '',
        tags: [],
        suggest_tags: [],

        tag_idx: -1,
        tag_name: '',
        state: 0,
        msg: ''
    } as Entry
    pnew$$focus_tag: any
    pnew$$F: any

    pupdate = {
        title: '',
        notes: '',
        tags: [],
        suggest_tags: [],

        tag_idx: -1,
        tag_name: '',
        state: 0,
        msg: ''
    } as Entry
    pupdate$$focus_tag: any

    pupdate$$F: any

    pnew_tag = {
        name: '',
        state: 0,
        msg: ''
    }
    pnew_tag$$F: any
    pnew_tag$$focus: any

    m: M

    static created(self: Home) {
        defp(self, 'm', { original: null })
        self.config = self['$root'].config

        self.pnew$$F = Home.send$$F.bind(self.pnew)
        self.pnew$$focus_tag = bindFocus('pnew-tag')

        self.pupdate$$F = Home.send$$F.bind(self.pupdate)
        self.pupdate$$focus_tag = bindFocus('pupdate-tag')

        self.pnew_tag$$F = Home.send$$F.bind(self.pnew_tag)
        self.pnew_tag$$focus = bindFocus('tag-new')
    }

    static mounted(self: Home) {
        self.url = self.config.url
        self.checkUnique$$()
    }

    static send$$F(this: HasState, err) {
        this.state = bit_clear_and_set(this.state, PojoState.LOADING, PojoState.ERROR)
        this.msg = extractMsg(err)
    }

    prepare(pojo: HasState) {
        pojo.state = bit_clear_and_set(pojo.state, PojoState.MASK_STATUS, PojoState.LOADING)
        pojo.msg = ''
    }

    success(pojo: HasState, msg?: string) {
        if (msg) {
            pojo.state = bit_clear_and_set(pojo.state, PojoState.LOADING, PojoState.SUCCESS)
            pojo.msg = msg
        } else {
            pojo.state ^= PojoState.LOADING
        }
    }

    static watch(self: Home, update: boolean) {
        self['$watch'](function () {
            return update ? self.pupdate.tag_name : self.pnew.tag_name
        }, debounce(function (val) {
            self.fetchTag(val, update)
        }, 300))
    }

    checkUnique$$() {
        // PS
        let param = `{"1": "${$escape(this.url)}", "4": {"1": false, "2": 1} }`
        post('/bookmarks/user/qBookmarkEntry0Url', param).then((data) => {
            this.initialized = true
            
            let array: Entry[] = data['1']
            if (!array || !array.length) {
                let config = this.config,
                    pnew = this.pnew
                
                this.unique = true
                pnew.title = config.title
                pnew.notes = config.notes
                Home.watch(this, false)
                nextTick(this.pnew$$focus_tag)
                return
            }

            let original = array[0],
                pupdate = this.pupdate,
                tags = toTagArray(original[$0.serTags], original[$0.tags]),
                tagCount = tags.length
            
            this.m.original = original
            pupdate.title = original[$0.title]
            pupdate.notes = original[$0.notes]
            pupdate.tags = tags
            Home.watch(this, true)
            if (tagCount < MAX_TAGS)
                nextTick(this.pupdate$$focus_tag)
        }).then(undefined, (err) => {
            // probably down?
            this.initialized = true

            let config = this.config,
                pnew = this.pnew
            
            this.unique = true
            pnew.title = config.title
            pnew.notes = config.notes
        })
    }
    pupdate$$str(e, field: string) {
        let pupdate = this.pupdate,
            original = this.m.original,
            mc = {},
            req
        
        if (!diffVmFieldTo(mc, $descriptor, original, pupdate, field))
            return
        
        req = { '1': original['1'], '2': mc }

        this.prepare(pupdate)

        post('/bookmarks/user/BookmarkEntry/update', JSON.stringify(req)).then(() => {
            let pupdate = this.pupdate,
                original = this.m.original
            
            original[$0[field]] = pupdate[field]

            this.success(pupdate, 'Updated')
        }).then(undefined, this.pupdate$$F)
    }
    fetchTag(val: string, update: boolean) {
        let pojo = update ? this.pupdate : this.pnew,
            suggest_tags = pojo.suggest_tags
        
        if (suggest_tags.length)
            pojo.suggest_tags = []
        
        if (!val)
            return
        
        this.prepare(pojo)

        let param = `{"1": "${$escape(val)}", "4": {"1": false, "2": ${SUGGEST_TAGS_LIMIT}}}`
        post('/bookmarks/user/fBookmarkTag0Name', param).then((data) => {
            let array = data['1'] as any[]
            pojo.suggest_tags = array && array.length ? array.map(mapTag) : []
            pojo.tag_idx = -1
            
            this.success(pojo)
            nextTick(update ? this.pupdate$$focus_tag : this.pnew$$focus_tag)
        }).then(undefined, update ? this.pupdate$$F : this.pnew$$F)
    }
    pnew$$() {
        let pnew = this.pnew,
            p = {},
            req = { '1': p, '2': pnew.tags.map(mapId) },
            title = pnew.title,
            notes = pnew.notes
        
        p[$0.url] = this.url
        if (title)
            p[$0.title] = title
        if (notes)
            p[$0.notes] = notes
        
        this.prepare(pnew)
        
        post('/bookmarks/user/BookmarkEntry/create', JSON.stringify(req)).then((data) => {
            window.close()
        }).then(undefined, this.pnew$$F)
    }
    addTag(tag: Tag) {
        let id = tag.id,
            pnew = this.pnew,
            tags = pnew.tags,
            i = 0,
            len = tags.length
        
        pnew.suggest_tags = []
        pnew.tag_name = ''

        for (; i < len; i++) {
            if (id === tags[i].id) {
                // dup
                nextTick(this.pnew$$focus_tag)
                return
            }
        }

        tags.push(tag)
        if (tags.length < MAX_TAGS)
            nextTick(this.pnew$$focus_tag)
    }
    rmTag(tag: Tag, update?: boolean) {
        let id = tag.id,
            pojo = update ? this.pupdate : this.pnew,
            tags = pojo.tags,
            i = 0,
            len = tags.length
        
        for (; i < len; i++) {
            if (id === tags[i].id) {
                if (!update)
                    tags.splice(i, 1)
                break
            }
        }

        if (!update) {
            nextTick(this.pnew$$focus_tag)
            return
        }

        if (i === len) {
            // not found
            nextTick(this.pupdate$$focus_tag)
            return
        }
        
        this.prepare(pojo)
        
        let param = `{"1": "${this.m.original['1']}", "2": ${id}, "3": true}`
        post('/bookmarks/user/BookmarkEntry/updateTag', param).then((data) => {
            tags.splice(i, 1)
            
            this.success(this.pupdate, 'Updated')
            nextTick(this.pupdate$$focus_tag)
        }).then(undefined, this.pupdate$$F)

        nextTick(this.pupdate$$focus_tag)
    }
    insertTag(tag: Tag) {
        let id = tag.id,
            pupdate = this.pupdate,
            tags = pupdate.tags,
            i = 0,
            len = tags.length
        
        pupdate.suggest_tags = []
        pupdate.tag_name = ''

        for (; i < len; i++) {
            if (id === tags[i].id) {
                // dup
                nextTick(this.pupdate$$focus_tag)
                return
            }
        }

        this.prepare(pupdate)

        let param = `{"1": "${this.m.original['1']}", "2": ${id}, "3": false}`
        post('/bookmarks/user/BookmarkEntry/updateTag', param).then((data) => {
            tags.splice(data['1'], 0, tag)
            
            this.success(this.pupdate, 'Updated')
            nextTick(this.pupdate$$focus_tag)
        }).then(undefined, this.pupdate$$F)

        nextTick(this.pupdate$$focus_tag)
    }
    pnew$$keyup(e: KeyboardEvent): boolean {
        return handleKeyEvent(e, this.pnew, this, 'addTag')
    }
    pupdate$$keyup(e: KeyboardEvent): boolean {
        return handleKeyEvent(e, this.pupdate, this, 'insertTag')
    }
    newTag(e) {
        let pnew_tag = this.pnew_tag,
            name = pnew_tag.name
        if (!name)
            return
        
        this.prepare(pnew_tag)
        
        let param = `{"3": "${name}"}`
        post('/bookmarks/user/BookmarkTag/create', param).then((data) => {
            this.success(pnew_tag, `${pnew_tag.name} added.`)
            // clear
            pnew_tag.name = ''
            nextTick(this.pnew_tag$$focus)
        }).then(undefined, this.pnew_tag$$F)
    }
}
export default component({
    created(this: Home) { Home.created(this) },
    mounted(this: Home) { Home.mounted(this) },
    template: /**/`
<div>
<template v-if="initialized">
  <div class="mdl input">
    <input class="url" :value="url" placeholder="Url" disabled />
  </div>
  <div v-if="unique">
    <div class="mdl input">
      <input v-model.lazy.trim="pnew.title" placeholder="Title"
          :disabled="!!(pnew.state & ${PojoState.LOADING})" />
    </div>
    <div class="mdl input">
      <input v-model.lazy.trim="pnew.notes" placeholder="Notes"
          :disabled="!!(pnew.state & ${PojoState.LOADING})" />
    </div>
    <div class="msg" :class="{ error: ${PojoState.ERROR} === (pnew.state & ${PojoState.MASK_STATUS}) }"
        v-show="pnew.msg">{{pnew.msg}}<button class="b" @click.prevent="pnew.msg = null">x</button></div>
    <div class="mdl input">
      <input id="pnew-tag" placeholder="Tag(s)"
          @keyup="pnew$$keyup($event)" v-model.trim="pnew.tag_name"
          :disabled="!!(pnew.state & ${PojoState.LOADING}) || pnew.tags.length === ${MAX_TAGS}" />
    </div>
    <div class="dropdown" :class="{ active: pnew.suggest_tags.length }">
      <ul class="dropdown-menu mfluid">
        <li v-for="tag in pnew.suggest_tags" :class="{ current: !!(tag.state & ${TagState.CURRENT}) }">
          <a @click.prevent="addTag(tag)">{{tag.name}}</a>
        </li>
      </ul>
    </div>
    <div class="right-floated">
      <button class="pv primary" @click.prevent="pnew$$"
          :disabled="!!(pnew.state & ${PojoState.LOADING}) || (!!pnew.tag_name && !pnew.tags.length)"><b>Submit</b></button>
    </div>
    <ul class="tags">
      <li v-for="tag in pnew.tags">
        <a>{{tag.name}}<button class="b" @click.prevent="rmTag(tag, false)">x</button></a>
      </li>
    </ul>
  </div>
  <div v-if="!unique">
    <div class="mdl input">
      <input v-model.lazy.trim="pupdate.title" @change="pupdate$$str($event, '${$.title}')"
          :disabled="!!(pupdate.state & ${PojoState.LOADING})" placeholder="Title" />
    </div>
    <div class="mdl input">
      <input v-model.lazy.trim="pupdate.notes" @change="pupdate$$str($event, '${$.notes}')"
          :disabled="!!(pupdate.state & ${PojoState.LOADING})" placeholder="Notes" />
    </div>
    <div class="msg" :class="{ error: ${PojoState.ERROR} === (pupdate.state & ${PojoState.MASK_STATUS}) }"
        v-show="pupdate.msg">{{pupdate.msg}}<button class="b" @click.prevent="pupdate.msg = null">x</button></div>
    <div class="mdl input">
      <input id="pupdate-tag" placeholder="Tag(s)"
          @keyup="pupdate$$keyup($event)" v-model.trim="pupdate.tag_name"
          :disabled="!!(pupdate.state & ${PojoState.LOADING}) || pupdate.tags.length === ${MAX_TAGS}" />
    </div>
    <div class="dropdown" :class="{ active: pupdate.suggest_tags.length }">
      <ul class="dropdown-menu mfluid">
        <li v-for="tag in pupdate.suggest_tags" :class="{ current: !!(tag.state & ${TagState.CURRENT}) }">
          <a @click.prevent="insertTag(tag)">{{tag.name}}</a>
        </li>
      </ul>
    </div>
    <ul class="tags">
      <li v-for="tag in pupdate.tags">
        <a>{{tag.name}}<button class="b" @click.prevent="rmTag(tag, true)"
            :disabled="!!(pupdate.state & ${PojoState.LOADING})">x</button></a>
      </li>
    </ul>
  </div>
  <div id="bk-tag">
    <div class="mdl input">
      <input id="tag-new" placeholder="Add tag" v-model.trim="pnew_tag.name" @change="newTag($event)"
          :disabled="!!(pnew_tag.state & ${PojoState.LOADING})" />
    </div>
    <div class="msg" :class="{ error: ${PojoState.ERROR} === (pnew_tag.state & ${PojoState.MASK_STATUS}) }"
        v-show="pnew_tag.msg">{{pnew_tag.msg}}<button class="b" @click.prevent="pnew_tag.msg = null">x</button></div>
  </div>
</template>
</div>`/**/
}, Home)
