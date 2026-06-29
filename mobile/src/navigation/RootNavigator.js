import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import GamesScreen from '../screens/GamesScreen'
import GameDetailScreen from '../screens/GameDetailScreen'
import SetDetailScreen from '../screens/SetDetailScreen'
import CardDetailScreen from '../screens/CardDetailScreen'
import SearchScreen from '../screens/SearchScreen'
import CollectionScreen from '../screens/CollectionScreen'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import DecksScreen from '../screens/DecksScreen'
import DeckDetailScreen from '../screens/DeckDetailScreen'
import DeckAddCardsScreen from '../screens/DeckAddCardsScreen'
import CreateDeckScreen from '../screens/CreateDeckScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const screenOpts = {
  headerStyle: { backgroundColor: '#2d3243' },
  headerTintColor: '#08D9D6',
  headerTitleStyle: { color: '#EAEAEA' },
}

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Games" component={GamesScreen} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} />
      <Stack.Screen name="SetDetail" component={SetDetailScreen} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: 'Card' }} />
    </Stack.Navigator>
  )
}

function CollectionStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Collection" component={CollectionScreen} options={{ title: 'Collection' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
    </Stack.Navigator>
  )
}

function DecksStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Decks" component={DecksScreen} options={{ title: 'My Decks' }} />
      <Stack.Screen name="CreateDeck" component={CreateDeckScreen} options={{ title: 'New Deck' }} />
      <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={{ title: 'Deck' }} />
      <Stack.Screen name="DeckAddCards" component={DeckAddCardsScreen} options={{ title: 'Add Cards' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
    </Stack.Navigator>
  )
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#2d3243', borderTopColor: '#363d52' },
        tabBarActiveTintColor: '#08D9D6',
        tabBarInactiveTintColor: '#8892a4',
      }}
    >
      <Tab.Screen name="Browse" component={BrowseStack} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Collection" component={CollectionStack} />
      <Tab.Screen name="DecksTab" component={DecksStack} options={{ title: 'Decks' }} />
    </Tab.Navigator>
  )
}
