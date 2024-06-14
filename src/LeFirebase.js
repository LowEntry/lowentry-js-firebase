import {LeUtils, ARRAY} from '@lowentry/utils';
import {initializeApp} from 'firebase/app';
import {getAuth, signOut} from 'firebase/auth';
import {initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc} from 'firebase/firestore';
import {getDatabase, ref, onValue} from 'firebase/database';
import {getAnalytics} from 'firebase/analytics';
import {getPerformance, trace} from 'firebase/performance';
import {useAuthState} from 'react-firebase-hooks/auth';
import {useDocument, useDocumentData, useDocumentDataOnce, useDocumentOnce} from 'react-firebase-hooks/firestore';
import {useList, useListKeys, useListVals, useObject, useObjectVal} from 'react-firebase-hooks/database';


export const setup = (config) =>
{
	const app = initializeApp(config);
	const auth = getAuth(app);
	const store = (() =>
	{
		try
		{
			return initializeFirestore(app, {
				localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()}),
			});
		}
		catch(e)
		{
			console.error(e);
			return getFirestore(app);
		}
	})();
	const db = getDatabase(app);
	const analytics = getAnalytics(app);
	const performance = getPerformance(app);
	
	
	const createTraceEvent = (name) =>
	{
		const event = trace(performance, name);
		let started = false;
		let stopped = false;
		return {
			data:event,
			
			start:
				() =>
				{
					started = true;
					event.start();
				},
			startOnce:
				() =>
				{
					if(!started)
					{
						started = true;
						event.start();
					}
				},
			
			stop:
				() =>
				{
					stopped = true;
					try
					{
						event.stop();
					}
					catch(e)
					{
					}
				},
			stopOnce:
				() =>
				{
					if(!stopped)
					{
						stopped = true;
						try
						{
							event.stop();
						}
						catch(e)
						{
						}
					}
				},
			
			record:
				(startTime, duration, options) =>
				{
					stopped = true;
					event.record(startTime, duration, options);
				},
			recordOnce:
				(startTime, duration, options) =>
				{
					if(!stopped)
					{
						stopped = true;
						event.record(startTime, duration, options);
					}
				},
			
			cancel:
				() =>
				{
					stopped = true;
				},
		};
	};
	
	const traceEvents = {};
	const traces = new Proxy(traceEvents, {
		get:(target, key) =>
		    {
			    if(!(key in traceEvents))
			    {
				    traceEvents[key] = createTraceEvent(key);
			    }
			    return traceEvents[key];
		    },
	});
	
	
	const LOCAL_STORAGE_ID__USER = 'LeFirebase_user_' + config.projectId;
	let authenticatedUser = '';
	
	const setUser = (user) =>
	{
		const newUser = JSON.parse(JSON.stringify(user));
		if(!LeUtils.equals(user, authenticatedUser))
		{
			LeUtils.localStorageSet(LOCAL_STORAGE_ID__USER, {user:newUser});
		}
	};
	
	const getUser = () =>
	{
		if(authenticatedUser === '')
		{
			authenticatedUser = LeUtils.localStorageGet(LOCAL_STORAGE_ID__USER);
		}
		return authenticatedUser;
	};
	
	const clearUser = () =>
	{
		const promise = signOut(auth);
		setUser(null);
		return promise;
	};
	
	
	return {
		firebase:{app, store, db, analytics, performance, traces, auth, signOut:clearUser},
		
		// auth >>
		
		useAuthState:
			(...args) =>
			{
				const [user, loading] = useAuthState(auth, ...args);
				if(loading)
				{
					return [getUser(), false];
				}
				else
				{
					setUser(user);
					return [user, false];
				}
			},
		
		useAuthStateNoCache:
			(...args) =>
			{
				const [user, loading] = useAuthState(auth, ...args);
				if(loading)
				{
					return [user, loading];
				}
				else
				{
					setUser(user);
					return [user, loading];
				}
			},
		
		// auth <<
		
		// firestore >>
		
		useDocument:
			(path, options) => useDocument(doc(store, ...path), options),
		
		useDocumentData:
			(path, options) => useDocumentData(doc(store, ...path), options),
		
		useDocumentOnce:
			(path, options) => useDocumentOnce(doc(store, ...path), options),
		
		useDocumentDataOnce:
			(path, options) => useDocumentDataOnce(doc(store, ...path), options),
		
		setDocument:
			(path, data, onlyUpdateFields) => setDoc(doc(store, ...path), data, {}),
		
		updateDocument:
			(path, data, onlyUpdateFields) => setDoc(doc(store, ...path), data, onlyUpdateFields ? {mergeFields:ARRAY(onlyUpdateFields)} : {merge:true}),
		
		// firestore <<
		
		// database >>
		
		onRealtimeConnectedStatus:
			(callback) =>
			{
				const connectionRef = ref(db, '.info/connected');
				let listener = onValue(connectionRef, (snapshot) => callback(!!snapshot.val()));
				
				return {
					remove:
						() =>
						{
							if(listener !== null)
							{
								try
								{
									listener();
								}
								catch(e)
								{
									console.error('Removing the onConnectionStatus listener failed:', e);
								}
								listener = null;
							}
						},
				};
			},
		
		useRealtimeConnectedStatus:
			() =>
			{
				const [value, loading, error] = useObjectVal(ref(db, '.info/connected'));
				return [!!value, loading, error];
			},
		
		useRealtimeList:
			(path) => useList(ref(db, path)),
		
		useRealtimeListKeys:
			(path) => useListKeys(ref(db, path)),
		
		useRealtimeListVals:
			(path, options) => useListVals(ref(db, path), options),
		
		useRealtimeObject:
			(path) => useObject(ref(db, path)),
		
		useRealtimeObjectVal:
			(path, options) => useObjectVal(ref(db, path), options),
		
		// database <<
	};
};
